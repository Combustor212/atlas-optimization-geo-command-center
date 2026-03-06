import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const data = await FAQ.filter({ published: true }, 'order', 100);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="py-20 bg-gradient-to-b from-white via-purple-50/30 to-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-8 w-64 bg-purple-100 animate-pulse rounded mx-auto mb-4" />
          <div className="h-4 w-96 bg-purple-50 animate-pulse rounded mx-auto mb-12" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!faqs || faqs.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-white via-purple-50/30 to-white">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-4xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
          </motion.div>
          <p className="text-lg text-slate-600">
            Optimized for AI, Voice, and Search Engines
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4"
                >
                  <h3 className="text-lg font-semibold text-slate-900 flex-1">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="border-t border-purple-100 pt-4">
                          <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {faq.answer}
                          </p>
                          {faq.keywords && faq.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {faq.keywords.map((keyword, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}