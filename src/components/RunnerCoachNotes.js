
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const RunnerCoachNotes = ({ runner }) => {
  const { user } = useAuth();
  console.log('RunnerCoachNotes - user object:', user);
  console.log('RunnerCoachNotes - user.name:', user?.name);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [coachName, setCoachName] = useState(null);

  // Get coach email from URL parameters or auth context
  const getCoachEmail = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('coach') || user?.email || 'balajisankaran@gmail.com'; // fallback
  };

  const coachEmail = getCoachEmail();

  // Load coach name from database
  useEffect(() => {
    const loadCoachName = async () => {
      if (!coachEmail) return;
      
      try {
        const { data: coachData, error: coachError } = await supabase
          .from('v_rhwb_roles')
          .select('full_name')
          .eq('email_id', coachEmail.toLowerCase())
          .single();
        
        if (!coachError && coachData) {
          setCoachName(coachData.full_name);
        } else {
          // Fallback to email if v_rhwb_roles query fails
          setCoachName(coachEmail);
        }
      } catch (error) {
        console.error('Failed to fetch coach name:', error);
        // Fallback to email if query fails
        setCoachName(coachEmail);
      }
    };

    loadCoachName();
  }, [coachEmail]);

  // Load existing notes when component mounts
  useEffect(() => {
    const loadNotes = async () => {
      if (!runner?.email_id || !coachEmail) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profile_notes')
          .select('id, note, note_ts, delete_flag, comment_by')
          .ilike('email_id', runner.email_id)
          .ilike('comment_by', coachEmail)
          .eq('delete_flag', false) // Only load non-deleted notes
          .order('note_ts', { ascending: false });
        
        if (!error && data) {
          setNotes(data);
        } else {
          setNotes([]);
        }
      } catch (error) {
        console.error('Error loading coach notes:', error);
        setNotes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [runner?.email_id, coachEmail]);

  // Add a new note
  const addNewNote = useCallback(() => {
    const newNote = {
      note: '',
      note_ts: new Date().toISOString(),
      delete_flag: false,
      comment_by: coachEmail,
      isNew: true,
      isEditing: true
    };
    setNotes(prev => [newNote, ...prev]);
  }, [coachEmail]);

  // Listen for add note event from parent component
  useEffect(() => {
    const handleAddNote = (event) => {
      if (event.detail.runnerEmail === runner?.email_id) {
        addNewNote();
      }
    };

    window.addEventListener('addNote', handleAddNote);
    return () => window.removeEventListener('addNote', handleAddNote);
  }, [runner?.email_id, addNewNote]);

  // Save a specific note
  const saveNote = async (noteIndex) => {
    if (!runner?.email_id || !coachEmail) return;
    
    const noteToSave = notes[noteIndex];
    if (!noteToSave.note.trim()) {
      // Remove empty notes
      setNotes(prev => prev.filter((_, index) => index !== noteIndex));
      return;
    }
    
    try {
      setIsSaving(true);
      
      if (noteToSave.isNew) {
        // Insert new note
        const { data, error } = await supabase
          .from('profile_notes')
          .insert([{
            email_id: runner.email_id,
            note: noteToSave.note,
            note_ts: noteToSave.note_ts,
            comment_by: coachEmail,
            delete_flag: false
          }])
          .select();
        
        if (error) {
          console.error('Error saving new note:', error);
          alert('Failed to save note. Please try again.');
          return;
        }
        
        // Update local state with the saved note (including the new ID)
        setNotes(prev => prev.map((note, index) => 
          index === noteIndex 
            ? { ...data[0], isNew: false, isEditing: false }
            : note
        ));
      } else {
        // Update existing note
        const { error } = await supabase
          .from('profile_notes')
          .update({
            note: noteToSave.note,
            note_ts: new Date().toISOString()
          })
          .eq('id', noteToSave.id);
        
        if (error) {
          console.error('Error updating note:', error);
          alert('Failed to update note. Please try again.');
          return;
        }
        
        // Update local state
        setNotes(prev => prev.map((note, index) => 
          index === noteIndex 
            ? { ...note, note_ts: new Date().toISOString(), isEditing: false }
            : note
        ));
      }
      
      // setLastSaved(new Date());
      
      // Update notes_present in runners_profile
      const { error: updateError } = await supabase
        .from('runners_profile')
        .update({ notes_present: true })
        .ilike('email_id', runner.email_id);
      
      if (updateError) {
        console.error('Failed to update notes_present:', updateError);
      }
      
      // Trigger a refresh of the parent component to update the star color
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notesUpdated', { 
          detail: { emailId: runner.email_id, hasNotes: true } 
        }));
      }
      
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Show delete confirmation dialog
  const showDeleteWarning = (noteIndex) => {
    setNoteToDelete({ index: noteIndex, note: notes[noteIndex] });
    setShowDeleteConfirm(true);
  };

  // Cancel delete confirmation
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setNoteToDelete(null);
  };

  // Soft delete a note (mark as deleted instead of removing)
  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    const noteIndex = noteToDelete.index;
    const noteToDeleteData = noteToDelete.note;
    
    if (noteToDeleteData.isNew) {
      // Just remove from local state if it's a new note
      setNotes(prev => prev.filter((_, index) => index !== noteIndex));
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
      return;
    }
    
    try {
      // Mark the note as deleted (soft delete)
      const { error } = await supabase
        .from('profile_notes')
        .update({ delete_flag: true })
        .eq('id', noteToDeleteData.id);
      
      if (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
        return;
      }
      
      // Remove from local state
      setNotes(prev => prev.filter((_, index) => index !== noteIndex));
      
      // Update notes_present if no notes remain
      if (notes.length === 1) {
        const { error: updateError } = await supabase
          .from('runners_profile')
          .update({ notes_present: false })
          .ilike('email_id', runner.email_id);
        
        if (updateError) {
          console.error('Failed to update notes_present:', updateError);
        }
        
        // Trigger a refresh of the parent component to update the star color
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notesUpdated', { 
            detail: { emailId: runner.email_id, hasNotes: false } 
          }));
        }
      }
      
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
      
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const handleNoteChange = (noteIndex, value) => {
    setNotes(prev => prev.map((note, index) => 
      index === noteIndex 
        ? { ...note, note: value }
        : note
    ));
  };

  const handleEditNote = (noteIndex) => {
    setNotes(prev => prev.map((note, index) => 
      index === noteIndex 
        ? { ...note, isEditing: true }
        : note
    ));
  };

  const handleSaveNote = (noteIndex) => {
    saveNote(noteIndex);
  };

  const handleCancelEdit = (noteIndex) => {
    const note = notes[noteIndex];
    if (note.isNew) {
      // Remove new note if it's empty
      setNotes(prev => prev.filter((_, index) => index !== noteIndex));
    } else {
      // Reset to original state
      setNotes(prev => prev.map((note, index) => 
        index === noteIndex 
          ? { ...note, isEditing: false }
          : note
      ));
    }
  };

  // Get coach name from email
  const getCoachName = (email) => {
    // Use the same logic as the header - prioritize JWT token name, then database, then fallback to email
    console.log('getCoachName called with email:', email);
    console.log('user object:', user);
    console.log('user.name:', user?.name);
    console.log('coachName from database:', coachName);
    
    if (user?.name) {
      console.log('Returning user.name:', user.name);
      return user.name;
    }
    
    if (coachName) {
      console.log('Returning coachName from database:', coachName);
      return coachName;
    }
    
    // Fallback: Extract name from email (simple implementation)
    const name = email.split('@')[0];
    const fallbackName = name.charAt(0).toUpperCase() + name.slice(1);
    console.log('Returning fallback name:', fallbackName);
    return fallbackName;
  };

  if (isLoading) {
    return (
      <div className="bg-yellow-50 rounded-xl p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
          <span className="ml-2 text-sm text-yellow-600">Loading notes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No notes yet. Click "Add Note" to get started.</p>
          </div>
        ) : (
          notes.map((note, index) => (
            <div key={note.id || index} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
              {/* Desktop: Table-like layout */}
              <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:items-start">
                <div className="sm:col-span-3 text-sm text-gray-600">
                  {new Date(note.note_ts).toLocaleString()}
                </div>
                <div className="sm:col-span-2 text-sm text-gray-600">
                  {getCoachName(note.comment_by)}
                </div>
                <div className="sm:col-span-5">
                  {note.isEditing ? (
                    <textarea
                      value={note.note}
                      onChange={(e) => handleNoteChange(index, e.target.value)}
                      placeholder="Write your note here..."
                      className="w-full h-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-sm"
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.note}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {note.isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveNote(index)}
                          disabled={isSaving}
                          className="text-green-600 hover:text-green-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => handleCancelEdit(index)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditNote(index)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => showDeleteWarning(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Mobile: Stacked layout */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(note.note_ts).toLocaleString()}</span>
                  <span>{getCoachName(note.comment_by)}</span>
                </div>
                
                <div>
                  {note.isEditing ? (
                    <textarea
                      value={note.note}
                      onChange={(e) => handleNoteChange(index, e.target.value)}
                      placeholder="Write your note here..."
                      className="w-full h-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-sm"
                      disabled={isSaving}
                    />
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.note}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end space-x-3 pt-2">
                  {note.isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveNote(index)}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleCancelEdit(index)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditNote(index)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => showDeleteWarning(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Delete Note</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this note?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunnerCoachNotes;