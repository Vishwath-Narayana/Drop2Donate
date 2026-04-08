import { Link } from 'react-router-dom';
import heroImg from '../assets/hero-premium.png';

const features = [
  {
    icon: '🍱',
    title: 'Surplus Food',
    desc: 'Share nutritious meals before they go to waste. Precise expiry tracking ensures safety.',
  },
  {
    icon: '🧥',
    title: 'Dignified Clothing',
    desc: 'Pass on quality apparel to those in need. Simple, direct matching with verified NGOs.',
  },
  {
    icon: '🏠',
    title: 'Verified NGOs',
    desc: 'Our network consists of vetted organizations committed to transparent community service.',
  },
  {
    icon: '📍',
    title: 'Local Impact',
    desc: 'Real-time location matching connects you with nearby organizations for immediate impact.',
  },
];

const stats = [
  { value: '12k+', label: 'Meals Saved' },
  { value: '450+', label: 'Active NGOs' },
  { value: '8k+',  label: 'Direct Donors' },
  { value: '100%', label: 'Transparency' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-emerald-100">
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <span className="text-white font-black text-sm italic">D2</span>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">Drop2Donate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-emerald-600 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2.5 px-6">
              Join the Movement
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero section ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Community-driven Giving
            </div>
            <h1 className="text-6xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tighter">
              Connecting surplus<br />
              <span className="text-emerald-600">to the soul</span> of our<br />
              neighborhoods.
            </h1>
            <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
              We bridge the gap between excess and essential. A minimalist platform designed for 
              frictionless giving, connecting donors with verified NGOs and volunteer couriers 
              in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/register?role=donor" className="btn-primary text-base py-4 px-10">
                Start Donating
              </Link>
              <Link to="/login" className="btn-secondary text-base py-4 px-10">
                Explore the Map
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-4 bg-emerald-100 rounded-[3rem] blur-3xl opacity-30 animate-pulse" />
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-100 border-8 border-white group">
              <img 
                src={heroImg} 
                alt="Donation Impact" 
                className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/20 to-transparent flex justify-end">
                <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-xl text-[10px] font-bold text-gray-900 uppercase tracking-widest">
                  Est. 2024
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center group">
                <div className="text-4xl font-black text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors">
                  {s.value}
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                Designed for direct resonance.
              </h2>
              <p className="text-slate-500 text-lg">
                We've stripped away the noise to build a system of pure purpose.
              </p>
            </div>
            <Link to="/register" className="text-emerald-600 font-bold text-sm tracking-widest uppercase hover:underline">
              Join the Network →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
            {features.map((f, i) => (
              <div key={i} className="space-y-4 group">
                <div className="w-16 h-16 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all duration-300 transform group-hover:-rotate-6">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Focus ──────────────────────────────────────────────────────── */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8">
          <div className="bg-indigo-600 rounded-[3rem] p-12 text-white space-y-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 group-hover:translate-x-4 transition-transform duration-500">🤝</div>
            <div className="space-y-4 z-10">
              <h3 className="text-4xl font-black tracking-tight leading-none">For Donors</h3>
              <p className="text-indigo-100 max-w-sm">
                Transform surplus into solidarity. Post in seconds, track in real-time.
              </p>
            </div>
            <Link to="/register?role=donor" className="bg-white text-indigo-600 font-bold px-8 py-4 rounded-2xl w-fit hover:bg-indigo-50 transition-colors z-10">
              Start Giving
            </Link>
          </div>

          <div className="bg-emerald-600 rounded-[3rem] p-12 text-white space-y-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-12 text-9xl opacity-10 group-hover:translate-x-4 transition-transform duration-500">🏢</div>
            <div className="space-y-4 z-10">
              <h3 className="text-4xl font-black tracking-tight leading-none">For NGOs</h3>
              <p className="text-emerald-100 max-w-sm">
                Direct access to local resources. No bureaucracy, just results.
              </p>
            </div>
            <Link to="/register?role=ngo" className="bg-white text-emerald-600 font-bold px-8 py-4 rounded-2xl w-fit hover:bg-emerald-50 transition-colors z-10">
              Apply to Join
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-black text-xs italic">D2</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">Drop2Donate</span>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            © {new Date().getFullYear()} Drop2Donate. Forged with purpose for a sustainable future.
          </p>
          <div className="flex gap-8">
            <Link to="/faq" className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-widest">About</Link>
            <Link to="/faq" className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-widest">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
