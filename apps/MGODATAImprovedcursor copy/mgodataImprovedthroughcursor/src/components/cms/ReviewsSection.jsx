import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { Review } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';

export default function ReviewsSection() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const data = await Review.filter({ published: true }, 'order', 100);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-64 bg-purple-100 animate-pulse rounded mx-auto mb-4" />
          <div className="h-4 w-96 bg-purple-50 animate-pulse rounded mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-slate-900 mb-4"
          >
            What Our Customers Say
          </motion.h2>
          <p className="text-lg text-slate-600">
            Trusted by 100+ Businesses Using AI Visibility Optimization
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border-0 bg-white shadow-sm hover:shadow-lg transition-all rounded-2xl">
                <CardContent className="p-6">
                  {/* Quote Icon */}
                  <div className="mb-4">
                    <Quote className="w-8 h-8 text-purple-200" />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-slate-700 leading-relaxed mb-6 italic">
                    "{review.reviewText}"
                  </p>

                  {/* Customer Info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <img
                      src={review.avatarUrl || `https://avatar.vercel.sh/${review.customerName}.png`}
                      alt={review.customerName}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{review.customerName}</p>
                      {review.businessName && (
                        <p className="text-sm text-slate-500">{review.businessName}</p>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  {review.keywords && review.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {review.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-medium rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}