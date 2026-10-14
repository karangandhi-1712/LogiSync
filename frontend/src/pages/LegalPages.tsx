import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

type PolicySection = { title: string; body: string[] };

const privacySections: PolicySection[] = [
  {
    title: 'Information this service uses',
    body: [
      'Account information can include your name, email address, mobile number, and password credentials. Driver accounts can also include vehicle details.',
      'Delivery information can include pickup port, delivery address and coordinates, package details, requested time window, priority, status history, and the contact details needed to complete the delivery.',
      'When a driver is working a delivery, the service can process location updates sent by the driver app so dispatchers and customers can follow the assigned route.',
      'The site stores your sign-in token and preferences such as theme and tutorial state in browser storage.',
    ],
  },
  {
    title: 'How information is used',
    body: [
      'Information is used to authenticate accounts, create and coordinate delivery requests, assign work, show delivery status, provide route and map features, and protect the service from misuse.',
      'Delivery contact and destination details are available to the port and assigned delivery personnel who need them to carry out the request.',
    ],
  },
  {
    title: 'Tracking links and account access',
    body: [
      'Customer account pages require sign-in and show only orders associated with that account. A separate tracking code can be used to view a delivery status page. Treat that code as private because anyone who has it may be able to view tracking information for that delivery.',
    ],
  },
  {
    title: 'Service providers and disclosure',
    body: [
      'Information may be processed by infrastructure and technical providers used to operate hosting, maps, address lookup, communications, and security features. Information may also be disclosed when required to respond to a valid legal request or to protect people and the service.',
      'LogiSync does not use delivery or account information to create public customer counters or testimonials.',
    ],
  },
  {
    title: 'Retention and security',
    body: [
      'Information is retained for as long as needed to operate delivery records, support account and operational needs, resolve disputes, and meet applicable requirements. Retention periods can vary by record type.',
      'Reasonable technical and organizational safeguards are used to protect information. No internet service can guarantee absolute security.',
    ],
  },
  {
    title: 'Your choices and questions',
    body: [
      'You can update certain account preferences in the site. For requests to access, correct, or remove account information, contact the administrator for your port or organization through your established support channel.',
      'This service is intended for logistics and delivery operations and is not designed for children.',
    ],
  },
];

const termsSections: PolicySection[] = [
  {
    title: 'Using LogiSync',
    body: [
      'LogiSync provides tools for creating and coordinating delivery requests, assigning delivery work, tracking operational status, and managing related accounts. Use the service only for lawful logistics and delivery activities you are authorized to perform.',
      'You are responsible for keeping account credentials private and for activity performed through your account. Notify your organization administrator if you believe an account has been used without permission.',
    ],
  },
  {
    title: 'Delivery information and charges',
    body: [
      'Provide accurate contact, pickup, destination, package, and timing information. Incorrect or incomplete information can delay or prevent a delivery.',
      'Any priority fee shown in the booking flow is an estimate or service charge displayed for that request. The site currently records delivery requests and does not process online payments.',
      'Submitting a request does not guarantee a particular dispatch time, route, delivery time, or driver assignment. These depend on operational availability and conditions.',
    ],
  },
  {
    title: 'Driver and operator responsibilities',
    body: [
      'Drivers and operators must use the service in line with their organization’s procedures, keep delivery status information accurate, and use location and contact information only for legitimate delivery operations.',
      'Do not submit prohibited or unsafe cargo, interfere with another user’s account, attempt to disrupt the service, or use the service to violate another person’s rights or applicable law.',
    ],
  },
  {
    title: 'Availability and operational data',
    body: [
      'Maps, route estimates, status updates, and operational data can be delayed, unavailable, or approximate. Use appropriate operational judgment and follow official port, road, and safety instructions.',
      'The service may be updated, suspended, or changed to maintain operations, security, or reliability.',
    ],
  },
  {
    title: 'Suspension and changes',
    body: [
      'An account may be restricted when needed to address security issues, misuse, or an organization’s access decision. Your organization remains responsible for its own users and operational policies.',
      'These terms may be updated as the service changes. The date at the top of this page indicates the latest revision. Continued use after an update means you accept the revised terms where permitted by law.',
    ],
  },
];

export function PrivacyPolicyPage() {
  return <LegalPage title="Privacy policy" intro="How LogiSync uses account, delivery, and operational information." icon="privacy" sections={privacySections} />;
}

export function TermsPage() {
  return <LegalPage title="Terms and conditions" intro="Rules for using LogiSync delivery and port operations features." icon="terms" sections={termsSections} />;
}

function LegalPage({
  title,
  intro,
  icon,
  sections,
}: {
  title: string;
  intro: string;
  icon: 'privacy' | 'terms';
  sections: PolicySection[];
}) {
  const Icon = icon === 'privacy' ? ShieldCheck : FileText;
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-300 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to LogiSync
        </Link>

        <header className="mt-10 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 grid place-items-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
            <Icon className="w-5 h-5" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">{intro}</p>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">Last updated 7 October 2026</p>
        </header>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {sections.map((section) => (
            <section key={section.title} className="py-6">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-6 flex gap-5 border-t border-slate-200 dark:border-slate-800 pt-5 text-sm">
          <Link to="/privacy" className="text-sky-800 dark:text-sky-300 hover:underline">Privacy policy</Link>
          <Link to="/terms" className="text-sky-800 dark:text-sky-300 hover:underline">Terms and conditions</Link>
        </footer>
      </div>
    </main>
  );
}
