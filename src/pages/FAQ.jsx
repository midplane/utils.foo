import React from 'react';
import SEO from '../SEO';

const faqs = [
    {
        question: "Why should I use this over a ton of other similar utilities?",
        answer: "utils.foo is client-side only, ads-free, and doesn't require any registration. The data never leaves your browser."
    },
    {
        question: "Is my data safe?",
        answer: "Absolutely! Your data never leaves your browser. The application is completely client-side that you can verify by inspecting the network logs."
    }
];

export default function FAQ() {
    return (
        <>
            <SEO
                title="FAQ | utils.foo"
                description="frequently asked questions about utils.foo"
            />
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl mb-6">Frequently Asked Questions</h1>
                <div className="space-y-6">
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-white border overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6">
                                <h3 className="leading-6 text-gray-900">{faq.question}</h3>
                            </div>
                            <div className="border-t border-gray-200">
                                <div className="px-4 py-5 sm:p-6">
                                    <p className="text-base text-gray-500">{faq.answer}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
