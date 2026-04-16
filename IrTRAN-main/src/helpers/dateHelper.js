export function getDiffDays(startDateString, endDateString) {
    let startDate = new Date(startDateString);
    let endDate = new Date(endDateString);
    let diffTime = endDate.getTime() - startDate.getTime();
    let diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays;
}
