import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🍱',
    title: 'Food Donations',
    desc: 'Share surplus cooked meals, groceries, and food items before they go to waste. Auto-expiry tracking keeps listings accurate.',
  },
  {
    icon: '👗',
    title: 'Clothing Drives',
    desc: 'Donate clothes, shoes, and accessories. No expiry pressure — listings stay active until claimed by an NGO.',
  },
  {
    icon: '🤝',
    title: 'NGO Network',
    desc: 'Verified NGOs browse nearby donations in real time and send claim requests directly to donors.',
  },
  {
    icon: '🚴',
    title: 'Delivery Agents',
    desc: 'On-demand delivery agents bridge the gap when NGOs can\'t self-collect. Live GPS tracking for full transparency.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Updates',
    desc: 'Socket.IO powers instant notifications for claim approvals, deliveries, and status changes — no refreshing needed.',
  },
  {
    icon: '🔒',
    title: 'Verified & Secure',
    desc: 'NGOs go through admin verification. JWT-secured APIs, role-based access, and full audit trails protect every transaction.',
  },
];

const steps = [
  {
    role: 'Donor',
    color: 'orange',
    icon: '📦',
    gradient: 'from-orange-500 to-orange-600',
    steps: [
      'Post a food or clothing donation',
      'Receive claim requests from NGOs',
      'Approve or reject with one tap',
      'Track delivery in real time',
    ],
  },
  {
    role: 'NGO',
    color: 'green',
    icon: '🌿',
    gradient: 'from-green-500 to-green-700',
    steps: [
      'Browse nearby available donations',
      'Send a claim request to the donor',
      'Choose self-pickup or request delivery',
      'Confirm pickup to complete the cycle',
    ],
  },
  {
    role: 'Delivery Agent',
    color: 'blue',
    icon: '🚴',
    gradient: 'from-blue-500 to-blue-700',
    steps: [
      'See delivery requests near you',
      'Accept and start navigation',
      'Update status at each milestone',
      'Earn ratings from NGOs',
    ],
  },
];

const stats = [
  { value: '10,000+', label: 'Meals Saved' },
  { value: '500+',   label: 'Active NGOs' },
  { value: '2,000+', label: 'Deliveries' },
  { value: '98%',    label: 'Satisfaction' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">D2</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Drop2Donate</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-orange-50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Real-time donation platform
          </div>

          <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-tight mb-6">
            Turn Surplus into
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-green-700">
              Impact
            </span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Drop2Donate connects donors with verified NGOs and on-demand delivery agents
            to ensure food and clothing reaches those who need it — in real time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base py-3.5 px-8 shadow-lg hover:shadow-xl">
              Start Donating Free →
            </Link>
            <Link to="/login" className="btn-secondary text-base py-3.5 px-8">
              Sign In
            </Link>
          </div>

          {/* Quick role links */}
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-400 flex-wrap">
            {['Donor', 'NGO', 'Delivery Agent', 'Admin'].map((r) => (
              <span key={r} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-4xl font-black text-white mb-1">{value}</div>
                <div className="text-gray-400 text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900 mb-4">How It Works</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              A seamless three-role ecosystem — donors, NGOs, and delivery agents working together.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map(({ role, icon, gradient, steps: roleSteps }) => (
              <div key={role} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className={`bg-gradient-to-br ${gradient} p-6 text-white`}>
                  <div className="text-4xl mb-3">{icon}</div>
                  <h3 className="text-xl font-bold">{role}</h3>
                </div>
                <div className="p-6 space-y-3">
                  {roleSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Built with modern technology to make donation logistics effortless.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon, title, desc }) => (
              <div key={title} className="group p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:bg-green-50/30 transition-all duration-300">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Delivery flow visual ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-green-800 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-black mb-4">Full Traceability</h2>
          <p className="text-green-100 text-lg mb-12 max-w-xl mx-auto">
            Every donation is tracked from posting to final delivery — with real-time notifications at every step.
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {[
              { label: 'Posted', icon: '📦' },
              { label: 'Claimed', icon: '🤝' },
              { label: 'Approved', icon: '✅' },
              { label: 'In Transit', icon: '🚴' },
              { label: 'Delivered', icon: '🎉' },
            ].map(({ label, icon }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-center min-w-[80px]">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-xs font-semibold text-green-100">{label}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="text-green-300 text-xl font-bold hidden sm:block">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact section ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold mb-4">
                🌍 Real Impact
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-6">
                Fighting Waste, Building Community
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-6">
                Every kilogram of food donated prevents 2.5 kg of CO₂. Every bag of clothes
                saves litres of water. Drop2Donate makes it easy to turn your surplus into
                someone else's essential.
              </p>
              <div className="space-y-3">
                {[
                  '🌱 Reduce food waste and textile pollution',
                  '🏘️ Strengthen local community bonds',
                  '📊 Track your personal donation impact',
                  '⚡ Real-time matching — no delays',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🍱', label: 'Meals Distributed', value: '10,000+', color: 'bg-orange-50 border-orange-100' },
                { icon: '👗', label: 'Clothing Items', value: '5,000+', color: 'bg-blue-50 border-blue-100' },
                { icon: '🏢', label: 'NGOs Partnered', value: '500+', color: 'bg-green-50 border-green-100' },
                { icon: '🚴', label: 'Agents Active', value: '200+', color: 'bg-purple-50 border-purple-100' },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className={`${color} border rounded-2xl p-5 text-center`}>
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-2xl font-black text-gray-900">{value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-5xl mb-6">🌟</div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-gray-500 text-xl mb-10">
            Join thousands of donors, NGOs, and delivery agents creating real impact in their communities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register?role=donor" className="btn-donor text-base py-4 px-8 shadow-lg hover:shadow-xl">
              🍱 Start Donating
            </Link>
            <Link to="/register?role=ngo" className="btn-primary text-base py-4 px-8 shadow-lg hover:shadow-xl">
              🌿 Register Your NGO
            </Link>
            <Link to="/register?role=delivery" className="btn-delivery text-base py-4 px-8 shadow-lg hover:shadow-xl">
              🚴 Become an Agent
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
              <span className="text-white font-black text-xs">D2</span>
            </div>
            <span className="font-bold text-white text-sm">Drop2Donate</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Drop2Donate. Built to fight waste, build community.</p>
          <div className="flex gap-4 text-sm">
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
