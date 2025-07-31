
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
      if (!runner?.runner_name) return;
      
      try {
        setIsLoading(true);
        
        // Step 1: Find the runner by name in the runners_household table
        const { data: runnerData, error: runnerError } = await supabase
          .from('runners_household')
          .select('full_address')
          .ilike('runner_name', runner.runner_name)
          .single();
        
        if (runnerError || !runnerData) {
          console.error('Error finding runner in household table:', runnerError);
          setFamilyMembers([]);
          return;
        }
        
        const runnerAddress = runnerData.full_address;
        console.log('Found runner address:', runnerAddress);
        
        // Step 2: Find all family members with the same address (excluding the runner)
        const { data: familyData, error: familyError } = await supabase
          .from('runners_household')
          .select('*')
          .eq('full_address', runnerAddress)
          .neq('runner_name', runner.runner_name); // Exclude the runner themselves
        
        if (familyError) {
          console.error('Error loading family members:', familyError);
          setFamilyMembers([]);
          return;
        }
        
        console.log('Found family members:', familyData);
        setFamilyMembers(familyData || []);
        
      } catch (error) {
        console.error('Error loading family data:', error);
        setFamilyMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadFamilyData();
  }, [runner?.runner_name]);

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
            <span className="text-blue-600 font-medium">{member.runner_name}</span>
            <span className="text-gray-500">{member.ageGender}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RunnerFamilyMembers;