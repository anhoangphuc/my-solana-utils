import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-[90vh] bg-black text-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">About Us</h1>

        <div className="space-y-8">
          {/* Project Description */}
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Our Project</h2>
            <p className="text-gray-300 leading-relaxed">
              My Solana Utils is a collection of utility tools designed to make interacting with the Solana blockchain 
              easier and more efficient. Our flagship tool, the Token Account Manager, helps users manage their token 
              accounts with features like batch deletion, price tracking, and direct trading integration.
            </p>
          </section>

          {/* Team Section */}
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">The Team</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium">Lead Developer</h3>
                <p className="text-gray-300">
                  A passionate blockchain developer focused on creating user-friendly tools for the Solana ecosystem.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Contact Us</h2>
            <div className="space-y-4">
              <p className="text-gray-300">
                Have questions, suggestions, found a bug, or have any requests about tools? We also build custom tools for custom needs for any domain.
                We'd love to hear from you!
              </p>
              
              <div className="space-y-2">
                <p className="text-gray-300">
                  <span className="font-semibold">Email:</span>{' '}
                  <a 
                    href="mailto:hoangphucnb97@gmail.com" 
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    hoangphucnb97@gmail.com
                  </a>
                </p>
                
                <p className="text-gray-300">
                  <span className="font-semibold">GitHub:</span>{' '}
                  <a 
                    href="https://github.com/yourusername/my-solana-utils" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    my-solana-utils
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Back to Tools */}
          <div className="text-center pt-4">
            <Link 
              href="/" 
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 transition-colors rounded-lg text-white font-medium"
            >
              Back to Tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 