import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from '@/lib/consent/consent-state'

/** Same checks as parseConsent. Place after the banner content so only the complete region is revealed. */
export const CONSENT_REVEAL_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)}));if(c&&c.version===${CONSENT_VERSION}&&typeof c.analytics==='boolean'&&typeof c.marketing==='boolean'&&typeof c.savedAt==='string')return}catch(e){}document.currentScript.parentElement.hidden=false})()`
