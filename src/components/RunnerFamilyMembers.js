
import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const RunnerFamilyMembers = ({ runner }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Utility to calculate age from date string
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!runner || !runner.email_id) {
        setFamilyMembers([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, get the full_address for the selected runner
        const { data: runnerAddressData, error: addressError } = await supabase
          .from('runners_household')
          .select('full_address')
          .eq('email_id', runner.email_id)
          .single();
        
        if (addressError || !runnerAddressData) {
          setFamilyMembers([]);
          setIsLoading(false);
          return;
        }
        
        const runnerFullAddress = runnerAddressData.full_address;
        
        // Now get all household members with the same address, excluding the selected runner
        const { data, error } = await supabase
          .from('runners_household')
          .select('*')
          .eq('full_address', runnerFullAddress)
          .neq('email_id', runner.email_id);
        
        if (error || !data) {
          setFamilyMembers([]);
          setIsLoading(false);
          return;
        }

        // Fetch gender and runner_name for each household member from runners_profile
        const emailIds = data.map((member) => member.email_id);
        
        let profileMap = {};
        if (emailIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from('runners_profile')
            .select('email_id, gender, runner_name')
            .in('email_id', emailIds);
          
          if (!profileError && profiles) {
            profileMap = profiles.reduce((acc, profile) => {
              acc[profile.email_id] = profile;
              return acc;
            }, {});
          }
        }

        // Merge profile data into household data and format for display
        const formattedMembers = data.map((member) => {
          const age = calculateAge(member.dob);
          const profile = profileMap[member.email_id] || {};
          const gender = profile.gender || '';
          const displayName = profile.runner_name || 'Unknown';
          
          return {
            ...member,
            displayName,
            age,
            gender,
            ageGender: age !== null ? `${age} ${gender}` : gender || 'N/A'
          };
        });

        setFamilyMembers(formattedMembers);
      } catch (error) {
        console.error('Error fetching family members:', error);
        setError('Failed to load family members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFamilyMembers();
  }, [runner]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Loading family members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">No family members found</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {familyMembers.map((member, index) => (
          <li key={member.email_id || index} className="flex justify-between items-center py-2">
            <span className="text-blue-600 font-medium">{member.displayName}</span>
            <span className="text-gray-500">{member.ageGender}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RunnerFamilyMembers;