import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useEffect } from "react";

const lastUpdated = "August 20, 2026";

export default function Privacy() {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? null;

    document.title = "Privacy Policy | Aegis Rise";
    description?.setAttribute(
      "content",
      "Learn how Aegis Rise collects, uses, protects, and deletes account and social connection data.",
    );

    return () => {
      document.title = previousTitle;
      if (description && previousDescription !== null) {
        description.setAttribute("content", previousDescription);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            data-testid="link-back-to-aegis-rise"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Aegis Rise
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            Aegis Rise
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
          <p className="not-prose mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Aegis Rise
          </p>
          <h1>Privacy Policy</h1>
          <p className="lead">
            This Privacy Policy explains how Aegis Rise collects, uses, protects,
            and deletes information when you use our professional community
            platform.
          </p>
          <p className="not-prose text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>

          <h2>1. Information we collect</h2>
          <p>
            We collect the information you provide when you create and use an
            Aegis Rise account, including your name, email address, password
            credentials, chapter membership, profile information, posts,
            comments, shares, and other content you choose to submit.
          </p>
          <p>
            We also collect basic technical information needed to operate and
            secure the service, such as sign-in session data, device and browser
            information, approximate activity timestamps, and security logs.
          </p>

          <h2>2. Social account connections</h2>
          <p>
            Aegis Rise can let you connect supported social accounts, such as
            LinkedIn, Facebook, and Instagram. When you authorize a connection,
            we receive the account information and permissions approved in that
            authorization flow.
          </p>
          <p>
            Depending on the provider and your selected sharing preferences,
            this may include a provider account identifier, display name,
            profile image, access permissions, Page or professional-account
            information, and the ability to publish content you explicitly
            choose to share.
          </p>

          <h2>3. How we use information</h2>
          <ul>
            <li>To create and maintain your Aegis Rise account.</li>
            <li>To provide chapter feeds, profiles, internal sharing, and moderation features.</li>
            <li>To connect and disconnect the social accounts you authorize.</li>
            <li>To publish content to an authorized social account when you request or enable that action.</li>
            <li>To protect the service, prevent abuse, and troubleshoot technical problems.</li>
            <li>To communicate with you about your account and important service updates.</li>
          </ul>

          <h2>4. Social publishing and sharing choices</h2>
          <p>
            Aegis Rise does not publish to a connected social account merely
            because you connected it. External publishing occurs when you
            choose a supported destination during sharing or enable an
            applicable sharing preference. You can update your preferences or
            disconnect a social account from your profile settings.
          </p>
          <p>
            Content shared to a third-party platform is also subject to that
            platform&apos;s terms and privacy policy. Aegis Rise cannot control
            how a third-party platform stores, displays, or further processes
            content after it has been published there.
          </p>

          <h2>5. How we protect information</h2>
          <p>
            We use reasonable administrative, technical, and organizational
            safeguards to protect account information. Social access tokens are
            encrypted before storage and are used only to provide the
            authorized connection features. No method of transmission or
            storage is completely secure, so we cannot guarantee absolute
            security.
          </p>

          <h2>6. When we share information</h2>
          <p>
            We share information with service providers that help us host,
            secure, operate, and improve Aegis Rise, and with third-party social
            platforms when you authorize a connection or request publishing.
            We may also disclose information when required by law, to protect
            the rights and safety of users or the service, or as part of a
            business transfer.
          </p>

          <h2>7. Retention and deletion</h2>
          <p>
            We retain information for as long as needed to provide the service,
            maintain security and records, resolve disputes, and meet legal
            obligations. Disconnecting a social account removes Aegis Rise&apos;s
            authorization to use that connection; it does not delete content
            already published on the third-party platform.
          </p>
          <p>
            You can request deletion of your Aegis Rise account and associated
            personal information by contacting us through the account support
            channel. We will verify the request, remove or de-identify eligible
            information, and retain only what we are legally required to keep.
          </p>

          <h2>8. Your choices</h2>
          <ul>
            <li>Review and update information in your profile.</li>
            <li>Disconnect authorized social accounts.</li>
            <li>Change external publishing preferences.</li>
            <li>Request access to or deletion of your account information.</li>
            <li>Opt out of non-essential communications.</li>
          </ul>

          <h2>9. Children&apos;s privacy</h2>
          <p>
            Aegis Rise is intended for professional communities and is not
            directed to children under 13. We do not knowingly collect personal
            information from children under 13.
          </p>

          <h2>10. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy as Aegis Rise changes. We will
            update the date above and provide additional notice when required
            by law.
          </p>

          <h2>11. Contact</h2>
          <p>
            For privacy questions or an account-data request, contact the Aegis
            Rise team through the support contact associated with your account.
          </p>
        </article>
      </main>
    </div>
  );
}