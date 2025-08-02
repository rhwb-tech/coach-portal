import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

const RunnerContact = ({ runner }) => {
  return (
    <div>
      {runner.phone_no ? (
        <div className="flex items-center text-gray-700 space-x-2">
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-1 text-gray-400" />
            <a 
              href={`tel:${runner.phone_no}`}
              className="hover:text-blue-600 hover:underline transition-colors"
              title="Click to call"
            >
              {runner.phone_no}
            </a>
          </div>
          <a 
            href={`https://wa.me/${runner.phone_no.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 transition-colors"
            title="Open WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </div>
  );
};

export default RunnerContact;