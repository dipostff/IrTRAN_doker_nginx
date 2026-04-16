import { useMainStore } from '../stores/main';
const mainStore = useMainStore();

export function updateTitle(title) 
{
    mainStore.title = title;
    updateSubtitle('');
}

export function updateSubtitle(subtitle) 
{
    mainStore.subtitle = subtitle;
}

export function updateSubtitleModal(subtitleModal) 
{
    mainStore.subtitleModal = subtitleModal;
}