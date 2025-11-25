import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, StickyNote, Trash2, Edit, Share2, Bookmark } from 'lucide-react';

const Notes = () => {
  const [notes, setNotes] = useState([
    {
      id: 1,
      title: 'Physics - Newton\'s Laws',
      content: 'Three fundamental laws of motion discovered by Isaac Newton...',
      tags: ['physics', 'mechanics'],
      docId: 'doc123',
      created: new Date(),
      color: 'blue'
    },
    {
      id: 2,
      title: 'Math - Quadratic Equations',
      content: 'Formula: ax² + bx + c = 0. Solutions can be found using...',
      tags: ['math', 'algebra'],
      docId: 'doc456',
      created: new Date(),
      color: 'purple'
    },
    {
      id: 3,
      title: 'Chemistry - Periodic Table',
      content: 'Elements organized by atomic number and properties...',
      tags: ['chemistry', 'elements'],
      docId: 'doc789',
      created: new Date(),
      color: 'green'
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const colors = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    red: 'from-red-500/20 to-pink-500/20 border-red-500/30'
  };

  const allTags = [...new Set(notes.flatMap(note => note.tags))];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-display font-bold mb-2">
          My <span className="gradient-text">Notes</span>
        </h1>
        <p className="text-primary-300">
          Keep all your study notes organized in one place
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card"
      >
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" size={20} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Tags Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-xl transition-all ${
                !selectedTag ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  selectedTag === tag ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Note
          </button>
        </div>
      </motion.div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-16"
        >
          <StickyNote size={64} className="mx-auto text-primary-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No notes found</h3>
          <p className="text-primary-400 mb-6">
            {searchTerm || selectedTag
              ? 'Try adjusting your search or filters'
              : 'Create your first note to get started'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create Note
          </button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`card-hover bg-gradient-to-br ${colors[note.color]} relative group`}
            >
              {/* Note Content */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                <p className="text-sm text-primary-300 line-clamp-3">
                  {note.content}
                </p>
              </div>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 rounded-full bg-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Share2 size={16} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <Bookmark size={16} />
                  </button>
                </div>
                <button className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Date */}
              <div className="text-xs text-primary-400 mt-4">
                {new Date(note.created).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notes;