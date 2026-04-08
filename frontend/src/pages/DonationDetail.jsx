import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { donationAPI, claimAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/map/MapView';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, formatExpiry, getStatusBadgeClass, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DonationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [message, setMessage] = useState('');
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await donationAPI.getById(id);
        setDonation(data.donation);
      } catch (err) {
        toast.error('Protocol target not found');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleClaim = async () => {
    if (!user.verified && user.role === 'ngo') {
      toast.error('Node verification required for allocation');
      return;
    }
    setClaiming(true);
    try {
      await claimAPI.create({ donationId: id, message });
      setShowClaimForm(false);
      setMessage('');
      toast.success('Allocation request broadcasted. Awaiting donor ACK.');
    } catch (err) {
      toast.error(err.message || 'Transmission failed');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="xl" /></div>
  );

  if (!donation) return null;

  const {
    title, type, description, quantity, status, expiryTime, cookedAt,
    donorId, location, images, allergens, isVegetarian, isVegan, servings,
    clothingDetails, deliveryAllowed, createdAt,
  } = donation;

  const typeIcon = type === 'food' ? '🍱' : '🧥';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-12 animate-fade-in">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <button onClick={() => navigate(-1)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors mb-2">
            ← Return to Hub
          </button>
          <div className="flex items-center gap-4">
             <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">{title}</h1>
             <span className={`badge ${getStatusBadgeClass(status)}`}>{status}</span>
          </div>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post Timestamp</p>
           <p className="text-sm font-bold text-slate-900">{formatDate(createdAt, 'MMM d, h:mm a')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        {/* Left Matrix: Content */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Visual Data */}
          {images?.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-[2.5rem] overflow-hidden bg-slate-50 aspect-video border border-slate-100 shadow-2xl shadow-slate-200/50">
                <img src={images[currentImage]?.url} alt={title} className="w-full h-full object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setCurrentImage(i)} className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${i === currentImage ? 'border-emerald-500 scale-105 shadow-lg shadow-emerald-100' : 'border-transparent'}`}>
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description Matrix */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] font-black italic">Protocol Description</span>
               <div className="h-px flex-1 bg-slate-50" />
            </div>
            <p className="text-lg text-slate-600 leading-relaxed font-medium italic">"{description}"</p>
          </div>

          {/* Technical Specs */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Core Logistics</p>
              <div className="space-y-1">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory Size</p>
                 <p className="text-xl font-black text-slate-900">{quantity?.amount} {quantity?.unit}</p>
              </div>
              {type === 'food' && (
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shelf Pulse</p>
                   <p className="text-xl font-black text-amber-600">{formatExpiry(expiryTime)}</p>
                </div>
              )}
              {servings && (
                <div className="space-y-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacity Estimate</p>
                   <p className="text-xl font-black text-slate-900">{servings} Individuals</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Node Constraints</p>
              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dispatch Allowed</span>
                    <span className={`badge ${deliveryAllowed ? '!bg-emerald-50 !text-emerald-600' : '!bg-slate-200 !text-slate-500'}`}>{deliveryAllowed ? 'YES' : 'NO'}</span>
                 </div>
                 {type === 'food' && (
                   <>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vegetarian Node</span>
                      <span className="badge">{isVegetarian ? 'YES' : 'NO'}</span>
                    </div>
                    {allergens?.length > 0 && (
                      <div className="pt-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-rose-500">Risk Matrix (Allergens)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {allergens.map(a => <span key={a} className="badge !bg-rose-50 !text-rose-600">{a}</span>)}
                        </div>
                      </div>
                    )}
                   </>
                 )}
                 {type === 'clothes' && clothingDetails && (
                   <div className="flex flex-wrap gap-2 pt-2">
                      {Object.entries(clothingDetails).map(([k, v]) => v && (
                        <span key={k} className="badge !bg-slate-200 !text-slate-600">{k}: {v}</span>
                      ))}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Interaction Node */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Identity Card */}
          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-6xl opacity-10">👤</div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic relative z-10">Originating Node</p>
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-black italic border border-white/20">
                 {donorId?.avatar ? <img src={donorId.avatar} className="w-full h-full object-cover rounded-2xl" /> : getInitials(donorId?.name)}
               </div>
               <div>
                 <p className="text-xl font-black tracking-tight uppercase">{donorId?.name}</p>
                 <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Verified Donor Node</p>
               </div>
            </div>
            {donorId?.rating?.count > 0 && (
               <div className="pt-4 flex items-center gap-2 border-t border-white/5 relative z-10">
                 <span className="text-amber-400 font-bold">★ {donorId.rating.average.toFixed(1)}</span>
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">({donorId.rating.count} Syncs)</span>
               </div>
            )}
          </div>

          {/* Allocation Protocol for NGO */}
          {user.role === 'ngo' && status === 'available' && (
            <div className="p-2 bg-emerald-50 rounded-[2.5rem] space-y-1">
              {!showClaimForm ? (
                <button
                  onClick={() => setShowClaimForm(true)}
                  disabled={!user.verified}
                  className="btn-primary w-full !py-8 !rounded-[2.3rem] !text-[12px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-200 disabled:opacity-30"
                >
                   Initiate Allocation
                </button>
              ) : (
                <div className="p-6 space-y-6 animate-fade-in bg-white rounded-[2.3rem] border-2 border-emerald-100 shadow-xl shadow-emerald-100">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Allocation Message</h3>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="input-field !rounded-[1.5rem] !bg-slate-50 !border-slate-100 focus:!bg-white resize-none text-xs font-bold uppercase tracking-tight"
                      rows={4}
                      placeholder="Input purpose or urgency matrix..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowClaimForm(false)} className="flex-1 btn-secondary !py-4 !rounded-2xl text-[10px] font-black uppercase">Abort</button>
                    <button onClick={handleClaim} disabled={claiming} className="flex-1 btn-primary !py-4 !rounded-2xl text-[10px] font-black uppercase border-none shadow-lg shadow-emerald-200">
                       {claiming ? <LoadingSpinner size="sm" color="white" /> : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
              {!user.verified && (
                <p className="text-[9px] font-black text-amber-600 text-center py-4 uppercase tracking-widest">NGO Node requires verification for interaction</p>
              )}
            </div>
          )}

          {/* Location Grid */}
          <div className="p-2 bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
             <div className="p-6 space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Satellite Convergence</p>
               <div className="rounded-[2rem] overflow-hidden border border-slate-200 grayscale contrast-125">
                 <MapView donations={[donation]} height="250px" showControls={false} />
               </div>
               {location?.address && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mt-2 pb-2">📍 Grid Ref: {location.address}</p>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
