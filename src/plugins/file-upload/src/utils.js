import { isValid, format } from 'date-fns';
import tinyColor from 'tinycolor2';

export function getFileSize(size) {
    const fSExt = ['Bytes', 'KB', 'MB', 'GB'];
    let i = 0;

    while (size > 900) {
        size /= 1024;
        i++;
    }
    return `${Math.floor(Math.round(size * 100) / 100)} ${fSExt[i]}`;
}

export function formatDate(date, formatString = 'dd-MM-yyyy') {
    date = new Date(date);
    if (!isValid(date)) return '';
    return format(date, formatString);
}

export function isDarkColor(color) {
    const r = tinyColor(color);
    return r?.isDark();
}
