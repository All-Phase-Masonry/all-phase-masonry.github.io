// "APM Webform" Apps Script (owner christopher@kilpen.com), the contact form's mail handler.
// Copy of the live Code.gs. Edit it in the Apps Script editor, then Deploy > Manage deployments >
// Edit > Version: New version (keep the same deployment so the /exec URL does not change).
// Needs Script Property TURNSTILE_SECRET (Project Settings > Script Properties). Never commit the secret.
// The template and response HTML files are unchanged.

//#### Variables -  Complete this section ####
// Email Header information
const emailHeader = {
  to: "sione@all-phase-masonry.com",
  fromName: "Website Form Submission",
  subject: "Someone submitted your website contact form!"
}

// Body of the email being sent by this script
const emailBody = {
  imageUrl: "https://www.kilpen.com/kilpen_logo.png",
  messageIntro: "Hello All Phase Masonry",
  messageMain: "Someone has reached out to you using your website.  Please contact them using the below details.",
  messageOutro: "KilPen Automator",
  footerText: "Need assistance?",
  footerButtonText: "KilPen Helpdesk",
  footerButtonUrl: "https://help.kilpen.com",
  formSourceUrl: "https://script.google.com/home/projects/18jKvVbMB61AzJl2UIKZkRW3pHrhljCEcxiZhGMEzCg_DeOoU4jP0-y22/"
}

// Only these fields go into the email, in this order. Anything else a bot adds is ignored.
const FORM_FIELDS = ['name', 'email', 'phone', 'message'];
//#### END VARIABLES ####

// GET no longer sends mail: the old GET URL was how the spam got in.
function doGet(e) {
  return HtmlService.createHtmlOutput(
    'Please use the contact form at <a href="https://all-phase-masonry.com/contact/">all-phase-masonry.com/contact</a>.');
}

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Honeypot: hidden from people, so a filled value means a bot. Drop it quietly.
  if (p.company) {
    console.log('Honeypot filled; dropped.');
    return HtmlService.createTemplateFromFile('response').evaluate();
  }

  if (!verifyTurnstile_(p['cf-turnstile-response'])) {
    console.log('Turnstile check failed; dropped.');
    return HtmlService.createHtmlOutput(
      'We could not confirm you are not a robot. Please go back and submit the form again.');
  }

  sendContactEmail_(p);
  return HtmlService.createTemplateFromFile('response').evaluate();
}

// Ask Cloudflare whether the Turnstile token is valid. Fails closed: no secret, no token,
// or no answer from Cloudflare all count as a failure.
function verifyTurnstile_(token) {
  if (!token) return false;
  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) {
    console.log('TURNSTILE_SECRET script property is not set.');
    return false;
  }
  try {
    const res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true
    });
    const out = JSON.parse(res.getContentText());
    if (!out.success) console.log('siteverify: ' + JSON.stringify(out['error-codes'] || []));
    return out.success === true;
  } catch (err) {
    console.log('siteverify error: ' + err);
    return false;
  }
}

function sendContactEmail_(p) {
  console.log('Starting form processor...');
  try {
    const responses = FORM_FIELDS.map(function (k) {
      return { title: k, ans: p[k] || '' };
    });

    const templ = HtmlService.createTemplateFromFile('template');
    templ.responses = responses;
    templ.emailBody = emailBody;

    console.log('Preparing message for email contents...');
    const message = templ.evaluate().getContent();

    console.log('Sending Email...');
    MailApp.sendEmail({
      to: emailHeader.to,
      name: emailHeader.fromName,
      subject: emailHeader.subject,
      htmlBody: message
    });
    console.log('Message sent.');
  } catch (e) {
    console.log('Something went wrong. ' + e);
  }
}

function authorizeFetch() {
  UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post', payload: { secret: 'x', response: 'x' }, muteHttpExceptions: true
  });
}
