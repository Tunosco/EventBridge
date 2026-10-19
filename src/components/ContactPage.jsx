import { useState } from 'react';

export default function ContactPage({ language = 'fr' }) {
  const [submitted, setSubmitted] = useState(false);
  const copy = language === 'en'
    ? { eyebrow: 'Contact', title: 'Let’s talk about your plans.', body: 'Tell us about the occasion you have in mind and the connections you are looking for.', name: 'Name', email: 'Email', subject: 'What can we help with?', message: 'Your message', send: 'Send message', success: 'Demonstration only: no message was sent.', event: 'Plan an event', provider: 'Introduce my business', other: 'Other topic', note: 'Demo form. No message will be sent.', footer: 'EventBridge connects ideas and talent.' }
    : language === 'it'
      ? { eyebrow: 'Contatti', title: 'Parliamo del tuo progetto.', body: 'Raccontaci l’occasione che immagini e le persone che cerchi.', name: 'Nome', email: 'Email', subject: 'Come possiamo aiutarti?', message: 'Il tuo messaggio', send: 'Invia il messaggio', success: 'Solo dimostrazione: nessun messaggio è stato inviato.', event: 'Organizzare un evento', provider: 'Presentare la mia attività', other: 'Altro argomento', note: 'Modulo demo. Nessun messaggio verrà inviato.', footer: 'EventBridge mette in contatto idee e talenti.' }
      : { eyebrow: 'Contact', title: 'Parlons de votre projet.', body: 'Racontez-nous l’occasion que vous imaginez et les talents que vous recherchez.', name: 'Nom', email: 'Adresse e-mail', subject: 'Comment pouvons-nous vous aider ?', message: 'Votre message', send: 'Envoyer le message', success: 'Démonstration : aucun message n’a été envoyé.', event: 'Préparer un événement', provider: 'Présenter mon activité', other: 'Autre sujet', note: 'Formulaire de démonstration. Aucun message n’est transmis.', footer: 'EventBridge met en relation les idées et les talents.' };

  const handleSubmit = (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    setSubmitted(true);
  };

  return (
    <main className="contact-page">
      <div className="contact-layout">
        <div className="contact-copy">
          <span className="kicker">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <span className="contact-note">{copy.footer}</span>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>{copy.name}<input name="name" autoComplete="name" required maxLength="120" /></label>
          <label>{copy.email}<input name="email" type="email" autoComplete="email" required maxLength="180" /></label>
          <label>{copy.subject}<select name="subject" defaultValue="event"><option value="event">{copy.event}</option><option value="provider">{copy.provider}</option><option value="other">{copy.other}</option></select></label>
          <label>{copy.message}<textarea name="message" rows="5" required maxLength="3000" /></label>
          <button className="button button-primary" type="submit">{copy.send}</button>
          <small>{copy.note}</small>
          {submitted && <p className="demo-status" role="status">{copy.success}</p>}
        </form>
      </div>
    </main>
  );
}