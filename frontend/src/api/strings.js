import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';
import { stringEntriesAsDictionary } from '../mock/stringsData';

/** getStrings -- the {key: {en,fa}} dictionary the I18nProvider fetches once on load. */
export async function getStrings() {
  if (USE_MOCK) {
    await mockDelay(80);
    return stringEntriesAsDictionary();
  }
  return request('/strings');
}
