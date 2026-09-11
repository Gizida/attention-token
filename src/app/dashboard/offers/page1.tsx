'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OffersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // Simulate completing an offer
  const handleCompleteOffer = async (offerId: string, reward: number) => {
    setLoading(offerId);
    try {
      // We get the user ID from localStorage where we might have stored it, 
      // OR we can just pass it via the URL. Since the mock postback expects a GET request:
      const userId = localStorage.getItem('userId') || '1'; // fallback to 1 for testing
      
      const response = await fetch(`/api/dev/mock-postback?user_id=${userId}&amount=${reward}&offer_id=${offerId}`);
      
      if (response.ok) {
        // Redirect to dashboard to see the updated balance
        window.location.href = '/dashboard';
      } else {
        alert('Failed to complete offer. You might have already completed it.');
      }
    } catch (error) {
      console.error('Error completing offer:', error);
    } finally {
      setLoading(null);
    }
  };

  // Mock offers data
  const mockOffers = [
    { id: 'mock_survey_1', title: 'Complete a Quick Survey', desc: 'Answer 5 questions about your shopping habits.', reward: 50, provider: 'AdGate' },
    { id: 'mock_game_1', title: 'Reach Level 10 in Space Game', desc: 'Download and reach level 10 in the mobile game.', reward: 500, provider: 'OfferToro' },
    { id: 'mock_signup_1', title: 'Sign up for Newsletter', desc: 'Subscribe to our partner\'s tech newsletter.', reward: 25, provider: 'CPX Research' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-2">Offers & Tasks</h1>
      <p className="text-secondary mb-8">Complete tasks from our partners to earn credits. (Currently in Mock Mode)</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockOffers.map((offer) => (
          <div key={offer.id} className="p-6 bg-surface rounded-lg border border-default flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-primary">{offer.title}</h3>
                <p className="text-xs text-muted mt-1">Provided by {offer.provider}</p>
              </div>
              <div className="bg-surface-elevated px-3 py-1 rounded-md border border-default">
                <span className="text-brand font-bold text-sm">+{offer.reward}</span>
              </div>
            </div>
            
            <p className="text-secondary text-sm flex-1 mb-6">{offer.desc}</p>
            
            <button
              onClick={() => handleCompleteOffer(offer.id, offer.reward)}
              disabled={loading === offer.id}
              className="w-full py-3 bg-brand text-background font-bold rounded-lg hover:bg-brand-hover transition disabled:opacity-50"
            >
              {loading === offer.id ? 'Processing...' : 'Start Task'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}