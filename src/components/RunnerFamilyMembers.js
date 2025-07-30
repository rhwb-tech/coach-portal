
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

  // Load family members data when component mounts
  useEffect(() => {
    const loadFamilyData = async () => {
      if (!runner?.email_id) return;
      
      try {
        setIsLoading(true);
        
        // Get household members
        const { data: householdData, error: householdError } = await supabase
          .from('runners_household')
          .select('*')
          .ilike('email_id', runner.email_id);
        
        if (householdError) {
          console.error('Error loading household data:', householdError);
          setFamilyMembers([]);
          return;
        }
        
        // Get additional household members
        const { data: additionalMembers, error: additionalError } = await supabase
          .from('runners_household')
          .select('*')
          .ilike('email_id', runner.email_id)
          .neq('relationship', 'Self');
        
        if (additionalError) {
          console.error('Error loading additional members:', additionalError);
        }
        
        // Combine and process the data
        const allMembers = [...(householdData || []), ...(additionalMembers || [])];
        setFamilyMembers(allMembers);
        
      } catch (error) {
        console.error('Error loading family data:', error);
        setFamilyMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFamilyData();
  }, [runner?.email_id]);

  // Load runner profile for additional info
  useEffect(() => {
    const loadRunnerProfile = async () => {
      if (!runner?.email_id) return;
      
      try {
        const { data, error } = await supabase
          .from('runners_profile')
          .select('*')
          .ilike('email_id', runner.email_id)
          .single();
        
        if (!error && data) {
          // setRunnerProfile(data); // This state variable is not defined in the original file
        }
      } catch (error) {
        console.error('Error loading runner profile:', error);
      }
    };

    loadRunnerProfile();
  }, [runner?.email_id]);

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