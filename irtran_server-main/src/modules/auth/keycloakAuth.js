//-----------Подключаемые модули-----------//
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const fileKeycloak = require('./../../../config/keycloak.json');
//-----------Подключаемые модули-----------//

// Конфиг Keycloak: переменные окружения (Docker) имеют приоритет
function getKeycloakConfig() {
  if (process.env.KEYCLOAK_AUTH_SERVER_URL) {
    return {
      realm: process.env.KEYCLOAK_REALM || fileKeycloak.realm,
      'auth-server-url': process.env.KEYCLOAK_AUTH_SERVER_URL,
      'jwks-url': process.env.KEYCLOAK_JWKS_URL || process.env.KEYCLOAK_AUTH_SERVER_URL,
      'ssl-required': process.env.KEYCLOAK_SSL_REQUIRED || fileKeycloak['ssl-required'],
      resource: process.env.KEYCLOAK_RESOURCE || fileKeycloak.resource,
      'verify-token-audience': fileKeycloak['verify-token-audience']
    };
  }
  return { ...fileKeycloak, 'jwks-url': fileKeycloak['auth-server-url'] };
}

const config_keycloak = getKeycloakConfig();

// При старте вывести конфиг Keycloak (для отладки 401)
const expectedIssuer = `${config_keycloak['auth-server-url'].replace(/\/$/, '')}/realms/${config_keycloak.realm}`;
const jwksBase = config_keycloak['jwks-url'] || config_keycloak['auth-server-url'];
console.log('[Keycloak] issuer (expected in token):', expectedIssuer);
console.log('[Keycloak] jwksUri:', `${jwksBase}/realms/${config_keycloak.realm}/protocol/openid-connect/certs`);

/**
 * Класс для аутентификации через Keycloak
 * В Docker: auth-server-url = URL в токене (issuer), например http://localhost:8080
 *            jwks-url = URL для запроса ключей из контейнера, например http://keycloak:8080
 */
class KeycloakAuth {
  /** JWKS клиент для получения публичных ключей */
  client;

  constructor() {
    this.client = jwksClient({
      jwksUri: `${jwksBase}/realms/${config_keycloak.realm}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 86400000, // 24 часа
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
  }

  /**
   * Проверка наличия realm‑роли у пользователя из токена.
   * Роли берутся из поля realm_access.roles в payload токена Keycloak.
   */
  hasRealmRole(user, roleName) {
    if (!user || !user.realm_access || !Array.isArray(user.realm_access.roles)) {
      return false;
    }
    return user.realm_access.roles.includes(roleName);
  }

  /**
   * Middleware, который требует наличия указанной realm‑роли.
   * Предполагается, что до него уже был выполнен verifyToken() и в req.user лежит payload токена.
   */
  requireRealmRole(roleName) {
    return (req, res, next) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'No user in request' });
      }

      if (!this.hasRealmRole(user, roleName)) {
        return res.status(403).json({
          error: 'forbidden',
          requiredRole: roleName
        });
      }

      next();
    };
  }

  /**
   * Middleware, который требует хотя бы одну роль из списка.
   */
  requireAnyRealmRole(roleNames) {
    return (req, res, next) => {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'No user in request' });
      }

      const hasAny = Array.isArray(roleNames)
        ? roleNames.some((r) => this.hasRealmRole(user, r))
        : false;

      if (!hasAny) {
        return res.status(403).json({
          error: 'forbidden',
          requiredAnyOf: roleNames
        });
      }

      next();
    };
  }

  /**
   * Получает ключ для проверки токена
   */
  getKey(header, callback) {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  /**
   * Middleware для проверки JWT токена
   */
  verifyToken() {
    return (req, res, next) => {
      // Получаем токен из заголовка Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Декодируем заголовок токена для получения kid
      let decoded;
      try {
        decoded = jwt.decode(token, { complete: true });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token format' });
      }

      if (!decoded || !decoded.header || !decoded.header.kid) {
        return res.status(401).json({ error: 'Invalid token header' });
      }

      // Получаем ключ и проверяем токен
      this.getKey(decoded.header, (err, key) => {
        if (err) {
          console.error('Error getting signing key:', err);
          return res.status(401).json({ error: 'Error verifying token' });
        }

        // Формируем параметры проверки токена (issuer — с косой и без, Keycloak может отдавать по-разному)
        const verifyOptions = {
          issuer: [expectedIssuer, expectedIssuer + '/'],
          algorithms: ['RS256']
        };

        if (config_keycloak['verify-token-audience'] !== false) {
          verifyOptions.audience = config_keycloak.resource;
        }

        // Проверяем токен
        jwt.verify(
          token,
          key,
          verifyOptions,
          (err, decoded) => {
            if (err) {
              let tokenIssuer = '(decode failed)';
              try {
                const payload = jwt.decode(token);
                if (payload && payload.iss) tokenIssuer = payload.iss;
              } catch (_) {}
              console.error('Token verification error:', err.message, '| expected issuer:', expectedIssuer, '| token iss:', tokenIssuer);
              return res.status(401).json({ error: 'Invalid token', details: err.message });
            }

            // Добавляем информацию о пользователе в запрос
            req.user = decoded;
            next();
          }
        );
      });
    };
  }

  /**
   * Middleware для опциональной проверки токена (не блокирует запрос)
   */
  optionalVerifyToken() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return next();
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        return next();
      }

      let decoded;
      try {
        decoded = jwt.decode(token, { complete: true });
      } catch (err) {
        return next();
      }

      if (!decoded || !decoded.header || !decoded.header.kid) {
        return next();
      }

      this.getKey(decoded.header, (err, key) => {
        if (err) {
          return next();
        }

        const verifyOptions = {
          issuer: [expectedIssuer, expectedIssuer + '/'],
          algorithms: ['RS256']
        };

        if (config_keycloak['verify-token-audience'] !== false) {
          verifyOptions.audience = config_keycloak.resource;
        }

        jwt.verify(
          token,
          key,
          verifyOptions,
          (err, decoded) => {
            if (!err) {
              req.user = decoded;
            }
            next();
          }
        );
      });
    };
  }
}

//-----------Экспортируемые модули-----------//
module.exports = new KeycloakAuth();
//-----------Экспортируемые модули-----------//




