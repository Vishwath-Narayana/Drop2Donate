import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationAPI } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import MapView from '../../components/map/MapView';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const FOOD_UNITS = ['kg', 'g', 'liters', 'portions', 'pieces', 'boxes', 'bags'];
const CLOTHES_UNITS = ['pieces', 'bags', 'boxes'];
const ALLERGEN_OPTIONS = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish'];

export default function DonationForm() {
  const navigate = useNavigate();
  const { location } = useGeolocation();
  const fileInputRef = useRef(null);

  const [type, setType] = useState('food');
  const [loading, setLoading] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    quantityAmount: '',
    quantityUnit: 'kg',
    cookedAt: '',
    expiryTime: '',
    deliveryRequired: false,
    servings: '',
    allergens: [],
    isVegetarian: false,
    isVegan: false,
    size: '',
    gender: '',
    season: '',
    condition: '',
  });

  const handleChange = (e) => {
    const { name, value, type: t, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: t === 'checkbox' ? checked : value }));
  };

  const toggleAllergen = (a) => {
    setForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(a)
        ? prev.allergens.filter((x) => x !== a)
        : [...prev.allergens, a],
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const previews = files.map((f) => URL.createObjectURL(f));
    setPreviewImages((prev) => [...prev, ...previews]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation && !location) {
      toast.error('Please set the pickup location on the map');
      return;
    }

    const loc = selectedLocation || location;
    const formData = new FormData();

    formData.append('title', form.title);
    formData.append('type', type);
    formData.append('description', form.description);
    formData.append('quantity', JSON.stringify({ amount: form.quantityAmount, unit: form.quantityUnit }));
    formData.append('location', JSON.stringify({
      type: 'Point',
      coordinates: [loc.lng, loc.lat],
      address: '',
    }));
    formData.append('expiryTime', form.expiryTime);
    formData.append('deliveryRequired', form.deliveryRequired);

    if (type === 'food') {
      if (form.cookedAt) formData.append('cookedAt', form.cookedAt);
      if (form.servings) formData.append('servings', form.servings);
      formData.append('allergens', JSON.stringify(form.allergens));
      formData.append('isVegetarian', form.isVegetarian);
      formData.append('isVegan', form.isVegan);
    } else {
      formData.append('clothingDetails', JSON.stringify({
        size: form.size,
        gender: form.gender,
        season: form.season,
        condition: form.condition,
      }));
    }

    // Attach files
    if (fileInputRef.current?.files) {
      Array.from(fileInputRef.current.files).forEach((f) => formData.append('images', f));
    }

    setLoading(true);
    try {
      await donationAPI.create(formData);
      toast.success('Donation created successfully!');
      navigate('/donor');
    } catch (err) {
      toast.error(err.message || 'Failed to create donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Donation</h1>
        <p className="text-gray-500 text-sm mt-0.5">Share your surplus items with those who need them</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selector */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">What are you donating?</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'food', icon: '🍱', label: 'Food' },
              { value: 'clothes', icon: '👗', label: 'Clothes' },
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  type === value
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-1">{icon}</div>
                <div className="font-semibold text-gray-800">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="input-field"
              placeholder={type === 'food' ? 'e.g., Freshly cooked biryani for 20 people' : 'e.g., Winter jacket collection'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input-field resize-none"
              rows={3}
              placeholder="Describe the donation in detail..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity *</label>
              <input
                type="number"
                name="quantityAmount"
                value={form.quantityAmount}
                onChange={handleChange}
                className="input-field"
                placeholder="Amount"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit *</label>
              <select name="quantityUnit" value={form.quantityUnit} onChange={handleChange} className="input-field">
                {(type === 'food' ? FOOD_UNITS : CLOTHES_UNITS).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Food-specific fields */}
        {type === 'food' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">Food Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cooked At</label>
                <input
                  type="datetime-local"
                  name="cookedAt"
                  value={form.cookedAt}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Servings (people)</label>
                <input
                  type="number"
                  name="servings"
                  value={form.servings}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="e.g., 20"
                  min={1}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isVegetarian" checked={form.isVegetarian} onChange={handleChange} className="w-4 h-4 rounded text-green-600" />
                <span className="text-sm text-gray-700">Vegetarian</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isVegan" checked={form.isVegan} onChange={handleChange} className="w-4 h-4 rounded text-green-600" />
                <span className="text-sm text-gray-700">Vegan</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAllergen(a)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      form.allergens.includes(a)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Clothes-specific fields */}
        {type === 'clothes' && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800">Clothing Details</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'gender', label: 'Gender', options: ['', 'men', 'women', 'kids', 'unisex'] },
                { name: 'season', label: 'Season', options: ['', 'summer', 'winter', 'all-season'] },
                { name: 'condition', label: 'Condition', options: ['', 'new', 'like-new', 'good', 'fair'] },
                { name: 'size', label: 'Size', placeholder: 'e.g., M, L, XL, 32' },
              ].map(({ name, label, options, placeholder }) =>
                options ? (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <select name={name} value={form[name]} onChange={handleChange} className="input-field">
                      {options.map((o) => <option key={o} value={o}>{o || `Select ${label}`}</option>)}
                    </select>
                  </div>
                ) : (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input type="text" name={name} value={form[name]} onChange={handleChange} className="input-field" placeholder={placeholder} />
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Expiry + Delivery */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Expiry & Pickup</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Time *</label>
            <input
              type="datetime-local"
              name="expiryTime"
              value={form.expiryTime}
              onChange={handleChange}
              className="input-field"
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 hover:border-green-400 transition-all">
            <input
              type="checkbox"
              name="deliveryRequired"
              checked={form.deliveryRequired}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 rounded text-green-600"
            />
            <div>
              <p className="font-medium text-gray-800 text-sm">Request delivery</p>
              <p className="text-xs text-gray-500 mt-0.5">A delivery agent will pick up and transport the donation to the NGO</p>
            </div>
          </label>
        </div>

        {/* Location picker */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Pickup Location</h2>
            <button
              type="button"
              onClick={() => setPickingLocation(!pickingLocation)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                pickingLocation ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {pickingLocation ? 'Cancel' : selectedLocation ? 'Change Location' : 'Pick on Map'}
            </button>
          </div>
          {selectedLocation ? (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              📍 Location set: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          ) : location ? (
            <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              📍 Using your current location (or click map to change)
            </p>
          ) : (
            <p className="text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-lg">
              Click the map to set pickup location
            </p>
          )}
          <MapView
            height="300px"
            pickingLocation={pickingLocation}
            onLocationPick={(loc) => {
              setSelectedLocation(loc);
              setPickingLocation(false);
            }}
            showControls={false}
          />
        </div>

        {/* Image Upload */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Images (optional)</h2>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center hover:border-green-400 transition-colors"
          >
            <p className="text-gray-500 text-sm">Click to upload images (max 5)</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 5MB each</p>
          </button>
          {previewImages.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {previewImages.map((src, i) => (
                <img key={i} src={src} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/donor')} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-donor flex-1 flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" color="white" /> : null}
            {loading ? 'Creating...' : 'Create Donation'}
          </button>
        </div>
      </form>
    </div>
  );
}
