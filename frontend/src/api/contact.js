import { request } from './client';
import { USE_MOCK, mockDelay } from './mockMode';

/** submitContactMessage -- fixes "Message To Administrator does nothing" (see ContactAdminModal). */
export async function submitContactMessage(message) {
  if (USE_MOCK) {
    await mockDelay();
    return null;
  }
  return request('/contact-admin', { method: 'POST', body: { message } });
}
