import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl mb-6">Privacy Policy</h1>
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl mb-3">Data Collection</h2>
          <p>We don&apos;t collect any data that&apos;s given during the usage of our tools. All operations are performed client-side, meaning everything happens right in your browser. It&apos;s like Vegas, but for your data - what happens in your browser, stays in your browser!</p>
        </section>

        <section>
          <h2 className="text-2xl mb-3">Third-Party Services</h2>
          <p>While we don&apos;t collect any data ourselves, we do use some third-party services to keep our site running smoothly:</p>
          <ul className="list-disc pl-5 mt-2">
            <li><strong>Cloudflare:</strong> We use Cloudflare for content delivery and DDoS protection. They may collect some technical information. You can read more about their privacy practices <a href="https://www.cloudflare.com/privacypolicy/" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">here</a>.</li>
            <li><strong>Google Analytics:</strong> We use Google Analytics to understand how our site is being used. They may collect information about your device and browsing habits. You can learn more about their privacy practices <a href="https://policies.google.com/privacy" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">here</a>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl mb-3">Your Choices</h2>
          <p>You&apos;re in control. If you&apos;re concerned about the data collected by our third-party partners, you can use browser extensions or features to block analytics and tracking.</p>
        </section>

        <section>
          <h2 className="text-2xl mb-3">Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We&apos;ll notify you of any changes by posting the new privacy policy on this page. You are advised to review this privacy policy periodically for any changes.</p>
        </section>

        <section>
          <h2 className="text-2xl mb-3">Contact Us</h2>
          <p>If you have any questions about this privacy policy, please contact us <Link target='_blank' className="text-blue-500 hover:text-blue-600" to='https://github.com/midplane/forum.utils.foo/issues'>here</Link>.</p>
        </section>
      </div>
    </div>
  );
}