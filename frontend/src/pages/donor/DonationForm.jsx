import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import MapView from '../../components/map/MapView';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FOOD_UNITS    = ['kg', 'g', 'liters', 'portions', 'pieces', 'boxes', 'bags'];
const CLOTHES_UNITS = ['pieces', 'bags', 'boxes'];
const ALLERGENS     = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish'];

const STEPS = [
  { id: 1, label: 'Type' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Location' },
  { id: 4, label: 'Review' },
];

export default function DonationForm() {
  const navigate     = useNavigate();
  const { location } = useGeolocation();
  const fileInputRef = useRef(null);

  const [step, setStep]   = useState(1);
  const [type, setType]   = useState('food');
  const [loading, setLoading] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);

  const [form, setForm] = useState({
    title: '', description: '',
    quantityAmount: '', quantityUnit: 'kg',
    cookedAt: '', expiryTime: '',
    deliveryAllowed: true,
    servings: '',
    allergens: [], isVegetarian: false, isVegan: false,
    size: '', gender: '', season: '', condition: '',
  });

  const set = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((p) => ({ ...p, [name]: t === 'checkbox' ? checked : value }));
  };

  const toggleAllergen = (a) =>
    setForm((p) => ({
      ...p,
      allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a],
    }));

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewImages.length > 5) { toast.error('Max 5 images'); return; }
    setPreviewImages((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (i) => setPreviewImages((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loc = selectedLocation || location;
    if (!loc) { toast.error('Please set a pickup location on the map'); return; }
    if (type === 'food' && !form.expiryTime) { toast.error('Expiry time is required for food'); return; }

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('type', type);
    fd.append('description', form.description);
    fd.append('quantity', JSON.stringify({ amount: form.quantityAmount, unit: form.quantityUnit }));
    fd.append('location', JSON.stringify({ type: 'Point', coordinates: [loc.lng, loc.lat] }));
    fd.append('deliveryAllowed', form.deliveryAllowed);

    if (type === 'food') {
      fd.append('expiryTime', form.expiryTime);
      if (form.cookedAt)  fd.append('cookedAt', form.cookedAt);
      if (form.servings)  fd.append('servings', form.servings);
      fd.append('allergens', JSON.stringify(form.allergens));
      fd.append('isVegetarian', form.isVegetarian);
      fd.append('isVegan', form.isVegan);
    } else {
      fd.append('clothingDetails', JSON.stringify({
        size: form.size, gender: form.gender, season: form.season, condition: form.condition,
      }));
    }

    if (fileInputRef.current?.files) {
      Array.from(fileInputRef.current.files).forEach((f) => fd.append('images', f));
    }

    setLoading(true);
    try {
      await donationAPI.create(fd);
      toast.success('Donation posted successfully!');
      navigate('/donor');
    } catch (err) {
      toast.error(err.message || 'Failed to create donation');
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return form.title && form.description && form.quantityAmount &&
      (type !== 'food' || form.expiryTime);
    if (step === 3) return !!(selectedLocation || location);
    return true;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/donor')} className="text-sm text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Donation</h1>
        <p className="text-gray-500 text-sm mt-0.5">Share your surplus with those who need it</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                step > s.id  ? 'bg-green-500 text-white' :
                step === s.id ? 'bg-green-600 text-white ring-4 ring-green-100' :
                                'bg-gray-100 text-gray-400'
              }`}>
                {step > s.id ? '✓' : s.id}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.id ? 'text-green-700' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Step 1: Type ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 text-lg">What are you donating?</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: 'food',    icon: '🍱', label: 'Food',    desc: 'Cooked meals, groceries, fruits…' },
                  { value: 'clothes', icon: '👗', label: 'Clothes', desc: 'Apparel, shoes, accessories…' },
                ].map(({ value, icon, label, desc }) => (
                  <button key={value} type="button" onClick={() => setType(value)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                      type === value ? 'border-orange-400 bg-orange-50 shadow-md' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <div className="text-3xl mb-2">{icon}</div>
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    {type === value && (
                      <span className="mt-2 inline-block text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                        Selected
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery allowed toggle */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-1">Pickup Options</h2>
              <p className="text-sm text-gray-500 mb-4">How can NGOs collect this donation?</p>
              <div className="space-y-3">
                {[
                  { val: true,  icon: '🚴', label: 'Allow delivery', desc: 'NGOs can request a delivery agent to pick up on their behalf' },
                  { val: false, icon: '🤝', label: 'Pickup only',    desc: 'NGOs must arrange their own transport — no delivery agents' },
                ].map(({ val, icon, label, desc }) => (
                  <button key={String(val)} type="button"
                    onClick={() => setForm((p) => ({ ...p, deliveryAllowed: val }))}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                      form.deliveryAllowed === val ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    {form.deliveryAllowed === val && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ───────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <h2 className="font-semibold text-gray-800 text-lg">Basic Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input type="text" name="title" value={form.title} onChange={set} required
                  className="input-field"
                  placeholder={type === 'food' ? 'e.g., Biryani for 20 people' : 'e.g., Winter jacket collection'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                <textarea name="description" value={form.description} onChange={set} required rows={3}
                  className="input-field resize-none" placeholder="Describe the item in detail…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
                  <input type="number" name="quantityAmount" value={form.quantityAmount} onChange={set}
                    className="input-field" placeholder="Amount" min={1} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit *</label>
                  <select name="quantityUnit" value={form.quantityUnit} onChange={set} className="input-field">
                    {(type === 'food' ? FOOD_UNITS : CLOTHES_UNITS).map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Food-specific */}
            {type === 'food' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🍱</span>
                  <h2 className="font-semibold text-gray-800">Food Details</h2>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  ⏰ Food items must have an expiry time. Items are auto-expired when time passes.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cooked At</label>
                    <input type="datetime-local" name="cookedAt" value={form.cookedAt} onChange={set} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Time *</label>
                    <input type="datetime-local" name="expiryTime" value={form.expiryTime} onChange={set}
                      className="input-field" min={new Date().toISOString().slice(0, 16)} required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Servings (no. of people)</label>
                  <input type="number" name="servings" value={form.servings} onChange={set}
                    className="input-field" placeholder="e.g., 20" min={1} />
                </div>
                <div className="flex gap-4">
                  {[['isVegetarian', '🌱 Vegetarian'], ['isVegan', '🌿 Vegan']].map(([name, label]) => (
                    <label key={name} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" name={name} checked={form[name]} onChange={set}
                        className="w-4 h-4 rounded accent-green-600" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contains Allergens</label>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGENS.map((a) => (
                      <button key={a} type="button" onClick={() => toggleAllergen(a)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          form.allergens.includes(a)
                            ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Clothes-specific */}
            {type === 'clothes' && (
              <div className="card space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">👗</span>
                  <h2 className="font-semibold text-gray-800">Clothing Details</h2>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                  ℹ️ Clothing items have no expiry date — they remain available until claimed.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'gender',    label: 'Gender',    options: ['', 'men', 'women', 'kids', 'unisex'] },
                    { name: 'season',    label: 'Season',    options: ['', 'summer', 'winter', 'all-season'] },
                    { name: 'condition', label: 'Condition', options: ['', 'new', 'like-new', 'good', 'fair'] },
                  ].map(({ name, label, options }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                      <select name={name} value={form[name]} onChange={set} className="input-field">
                        {options.map((o) => <option key={o} value={o}>{o || `Select ${label}`}</option>)}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Size</label>
                    <input type="text" name="size" value={form.size} onChange={set}
                      className="input-field" placeholder="e.g., M, L, 32" />
                  </div>
                </div>
              </div>
            )}

            {/* Images */}
            <div className="card space-y-3">
              <h2 className="font-semibold text-gray-800">Photos (optional)</h2>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 text-center hover:border-green-400 hover:bg-green-50 transition-all">
                <p className="text-2xl mb-1">📷</p>
                <p className="text-gray-500 text-sm font-medium">Click to upload photos</p>
                <p className="text-xs text-gray-400 mt-0.5">Up to 5 images, max 5MB each</p>
              </button>
              {previewImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previewImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Location ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 text-lg">Pickup Location</h2>
                <p className="text-sm text-gray-500 mt-0.5">Click the map to set the exact location</p>
              </div>
              <button type="button" onClick={() => setPickingLocation(!pickingLocation)}
                className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                  pickingLocation ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}>
                {pickingLocation ? '✕ Cancel' : selectedLocation ? '✎ Change' : '📍 Pick Location'}
              </button>
            </div>

            {selectedLocation ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 flex items-center gap-2">
                <span>✅</span>
                <span>Location set: <strong>{selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</strong></span>
              </div>
            ) : location ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800 flex items-center gap-2">
                <span>📍</span>
                <span>Using your current GPS location — or click the map to change</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-center gap-2">
                <span>⚠️</span>
                <span>GPS unavailable — please click the map to set your location</span>
              </div>
            )}

            <MapView
              height="320px"
              pickingLocation={pickingLocation}
              onLocationPick={(loc) => { setSelectedLocation(loc); setPickingLocation(false); }}
              showControls={false}
            />
          </div>
        )}

        {/* ── Step 4: Review ────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-800 text-lg mb-4">Review Your Donation</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['Type',        type === 'food' ? '🍱 Food' : '👗 Clothes'],
                  ['Title',       form.title],
                  ['Description', form.description],
                  ['Quantity',    `${form.quantityAmount} ${form.quantityUnit}`],
                  ...(type === 'food' ? [['Expiry', form.expiryTime ? new Date(form.expiryTime).toLocaleString() : '—']] : []),
                  ['Delivery',    form.deliveryAllowed ? '🚴 Allowed' : '🤝 Pickup only'],
                  ['Location',    selectedLocation
                    ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`
                    : location ? 'Current GPS location' : 'Not set'],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-gray-400 w-24 flex-shrink-0 font-medium">{label}</span>
                    <span className="text-gray-800 flex-1">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>

            {previewImages.length > 0 && (
              <div className="card">
                <p className="text-sm font-medium text-gray-700 mb-3">Photos ({previewImages.length})</p>
                <div className="flex gap-2 flex-wrap">
                  {previewImages.map((src, i) => (
                    <img key={i} src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary flex-1">
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}
              className="btn-primary flex-1 disabled:opacity-50">
              Continue →
            </button>
          ) : (
            <button type="submit" disabled={loading} className="btn-donor flex-1 flex items-center justify-center gap-2">
              {loading && <LoadingSpinner size="sm" color="white" />}
              {loading ? 'Posting…' : '🎉 Post Donation'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
