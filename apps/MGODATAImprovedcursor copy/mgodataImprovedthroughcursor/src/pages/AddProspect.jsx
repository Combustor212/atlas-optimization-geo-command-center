import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Prospect } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Building } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AddProspect() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: '',
    niche: '',
    city: '',
    address: '',
    phone: '',
    website: '',
    googleMapsUrl: '',
    gbpPrimaryCategory: '',
    reviewsCount: '',
    rating: '',
    instagramUrl: '',
    facebookUrl: '',
    yelpUrl: '',
    notes: '',
    status: 'New'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert numeric fields
      const submitData = {
        ...formData,
        reviewsCount: formData.reviewsCount ? parseInt(formData.reviewsCount) : undefined,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
        // Remove empty optional fields
        instagramUrl: formData.instagramUrl || undefined,
        facebookUrl: formData.facebookUrl || undefined,
        yelpUrl: formData.yelpUrl || undefined,
        website: formData.website || undefined,
        googleMapsUrl: formData.googleMapsUrl || undefined,
        gbpPrimaryCategory: formData.gbpPrimaryCategory || undefined,
        notes: formData.notes || undefined
      };

      await Prospect.create(submitData);
      navigate(createPageUrl('GeoMeoOperator'));
    } catch (error) {
      console.error('Error creating prospect:', error);
      alert('Error creating prospect. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild>
          <Link to={createPageUrl('GeoMeoOperator')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Operator
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Building className="w-8 h-8 text-indigo-600" />
            Add New Prospect
          </h1>
          <p className="text-slate-600 mt-1">Enter business details for GEO/MEO audit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  placeholder="Enter business name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="niche">Niche/Industry *</Label>
                <Input
                  id="niche"
                  value={formData.niche}
                  onChange={(e) => handleChange('niche', e.target.value)}
                  placeholder="e.g., HVAC, Restaurant, Dentist"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Full Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Online Presence */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle>Online Presence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="googleMapsUrl">Google Maps URL</Label>
                <Input
                  id="googleMapsUrl"
                  type="url"
                  value={formData.googleMapsUrl}
                  onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
                  placeholder="Google Business Profile URL"
                />
              </div>

              <div>
                <Label htmlFor="gbpPrimaryCategory">GBP Primary Category</Label>
                <Input
                  id="gbpPrimaryCategory"
                  value={formData.gbpPrimaryCategory}
                  onChange={(e) => handleChange('gbpPrimaryCategory', e.target.value)}
                  placeholder="Primary category on Google Business Profile"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reviewsCount">Review Count</Label>
                  <Input
                    id="reviewsCount"
                    type="number"
                    min="0"
                    value={formData.reviewsCount}
                    onChange={(e) => handleChange('reviewsCount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="rating">Average Rating</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => handleChange('rating', e.target.value)}
                    placeholder="4.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media (Optional) */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle>Social Media (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/business"
                />
              </div>

              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => handleChange('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/business"
                />
              </div>

              <div>
                <Label htmlFor="yelpUrl">Yelp URL</Label>
                <Input
                  id="yelpUrl"
                  type="url"
                  value={formData.yelpUrl}
                  onChange={(e) => handleChange('yelpUrl', e.target.value)}
                  placeholder="https://yelp.com/biz/business"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Internal notes about this prospect..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link to={createPageUrl('GeoMeoOperator')}>Cancel</Link>
          </Button>
          <Button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isSubmitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Prospect'}
          </Button>
        </div>
      </form>
    </div>
  );
}