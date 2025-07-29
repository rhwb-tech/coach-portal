
import React, { useState, useEffect } from 'react';
import { FileText, Save, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const RunnerCoachNotes = ({ runner }) => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Get coach email from URL parameters or auth context
  const getCoachEmail = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('coach') || 'balajisankaran@gmail.com'; // fallback
  };

  const coachEmail = getCoachEmail();

  // Load existing notes when component mounts
  useEffect(() => {
    const loadNotes = async () => {
      if (!runner?.email_id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('profile_notes')
          .select('id, note, note_ts, delete_flag, comment_by')
          .eq('email_id', runner.email_id)
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

  // Listen for add note event from parent component
  useEffect(() => {
    const handleAddNote = (event) => {
      if (event.detail.runnerEmail === runner?.email_id) {
        addNewNote();
      }
    };

    window.addEventListener('addNote', handleAddNote);
    return () => window.removeEventListener('addNote', handleAddNote);
  }, [runner?.email_id]);

  // Add a new note
  const addNewNote = () => {
    const newNote = {
      note: '',
      note_ts: new Date().toISOString(),
      delete_flag: false,
      comment_by: coachEmail,
      isNew: true,
      isEditing: true
    };
    setNotes(prev => [newNote, ...prev]);
  };

  // Save a specific note
  const saveNote = async (noteIndex) => {
    if (!runner?.email_id) return;
    
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
      
      setLastSaved(new Date());
      
      // Update notes_present in runners_profile
      const { error: updateError } = await supabase
        .from('runners_profile')
        .update({ notes_present: true })
        .eq('email_id', runner.email_id);
      
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
          .eq('email_id', runner.email_id);
        
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
    // Extract name from email (simple implementation)
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
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
      {/* Notes Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notes yet. Click "Add Note" to get started.</p>
                </td>
              </tr>
            ) : (
              notes.map((note, index) => (
                <tr key={note.id || index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(note.note_ts).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {getCoachName(note.comment_by)}
                  </td>
                  <td className="py-3 px-4">
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
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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