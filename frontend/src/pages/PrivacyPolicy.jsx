import React from "react";
import { Link } from "react-router-dom";

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
    <div className="text-sm text-gray-400 leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-10 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mb-6">
          &larr; Back to Home
        </Link>

        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mb-8">Last updated: {today}</p>

        <Section title="1. Introduction">
          <p>
            AntimPrayash.in ("we", "our", "the platform") provides mock tests, previous year papers, and
            performance analysis for students preparing for government exams. This policy explains what
            information we collect, how we use it, and the choices you have.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p>When you create an account, we collect:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Name, email address, phone number, and city/address</li>
            <li>The exam category you are preparing for</li>
            <li>Your test attempts, scores, and answers, used to generate your performance analysis</li>
          </ul>
          <p>
            We also automatically collect basic technical information (such as device type and general
            usage patterns) to keep the platform secure and working correctly.
          </p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc list-inside space-y-1">
            <li>To create and manage your account</li>
            <li>To show you relevant mock tests, papers, and content for your exam and batch</li>
            <li>To generate your personal analysis (accuracy, weak topics, time spent per question)</li>
            <li>To let your teacher (if you belong to a coaching batch) view your progress</li>
            <li>To send OTPs for signup and password reset</li>
          </ul>
        </Section>

        <Section title="4. Cookies and Advertising">
          <p>
            We use cookies to keep you logged in and to remember your preferences. We may also show
            advertisements on this platform through Google AdSense.
          </p>
          <p>
            Google, as a third-party vendor, uses cookies to serve ads based on your prior visits to this
            and other websites. You can opt out of personalized advertising by visiting{" "}
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A78BFA] hover:underline"
            >
              Google Ads Settings
            </a>
            , or by visiting{" "}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#A78BFA] hover:underline"
            >
              www.aboutads.info
            </a>{" "}
            to opt out of third-party vendor use of cookies for personalized advertising.
          </p>
        </Section>

        <Section title="5. Sharing of Information">
          <p>
            We do not sell your personal information. Your test performance data is visible to teachers of
            the batch you are enrolled in, for the purpose of guiding your preparation. We may share limited
            technical information with service providers (such as hosting and analytics) who help us run
            the platform.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p>
            We take reasonable technical measures to protect your information, including encrypted
            connections (HTTPS) and secure password storage. No method of transmission over the internet is
            100% secure, but we work to protect your data to the best of our ability.
          </p>
        </Section>

        <Section title="7. Your Choices">
          <p>
            You can update your profile information at any time from your account settings. You may request
            deletion of your account and associated data by contacting us using the details below.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            This platform is intended for students preparing for competitive government exams and is not
            directed at children under 13.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page
            with an updated "Last updated" date.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>If you have any questions about this Privacy Policy, please contact us through the platform.</p>
        </Section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
