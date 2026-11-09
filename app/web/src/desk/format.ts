/** "2.5.8 Target Size (Minimum)" is stored with its number; the number is shown as a code, so strip it from the title. */
export const bareTitle = (title = '') => title.replace(/^\d+\.\d+\.\d+\s*/, '')
