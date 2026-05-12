import React, { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getAstronautRank } from '../App';

export function UserSearchView({ user, onSelectUser }: { user: any, onSelectUser: (id: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const usersRef = collection(db, 'users');
        const searchTermExact = searchTerm.trim();
        const q1 = query(
          usersRef, 
          where('displayName', '>=', searchTermExact),
          where('displayName', '<=', searchTermExact + '\uf8ff'),
          limit(20)
        );
        
        const snapshot = await getDocs(q1);
        const fetchedUsers = snapshot.docs.map(doc => doc.data());
        
        setResults(fetchedUsers);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
          <Search size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-1">المحققون </h2>
          <p className="text-indigo-200">ابحث عن أصدقائك وتابع مستوياتهم وتعرف على رواد جدد</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none">
          <Search className="text-indigo-400/50" size={24} />
        </div>
        <input 
          type="text" 
          placeholder="ابحث بالاسم (مثال: أحمد)..."
          className="w-full bg-[#0a0b16]/80 border-2 border-indigo-500/30 focus:border-indigo-500 rounded-3xl py-5 pr-14 pl-6 text-white text-lg placeholder-indigo-300/30 outline-none transition-all shadow-[0_4px_20px_rgba(99,102,241,0.05)] focus:shadow-[0_4px_30px_rgba(99,102,241,0.2)]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isSearching && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-6">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {results.length > 0 ? (
            results.map((u, i) => (
              <motion.div 
                key={u.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-[#0f1123]/80 backdrop-blur-md rounded-3xl border border-white/5 hover:border-indigo-500/30 p-5 flex gap-4 items-center hover:bg-white/5 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/10"
                onClick={() => onSelectUser(u.uid)}
              >
                <img 
                  src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`} 
                  alt={u.displayName || 'Unnamed'} 
                  className="w-16 h-16 rounded-full bg-black/50 border-2 border-white/10 group-hover:border-indigo-400 transition-colors" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1">
                  <div className="font-bold text-lg text-white mb-1 group-hover:text-indigo-300 transition-colors">{u.displayName || 'رائد مجهول'}</div>
                  <div className={cn("text-xs font-bold inline-block px-2 py-0.5 rounded border border-current", getAstronautRank(u.xp || 0).color.replace('text-', 'bg-').replace('400', '500/20'))}>
                    {getAstronautRank(u.xp || 0).title}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-1 min-w-[70px]">
                  <div className="px-3 py-2 bg-black/40 rounded-xl border border-white/5 text-center w-full group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] text-gray-400 font-bold mb-1">المستوى</div>
                    <div className="font-mono font-black text-indigo-400 leading-none">{u.level || 0}</div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : searchTerm.trim().length >= 2 && !isSearching ? (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="col-span-1 md:col-span-2 text-center py-16 text-gray-500 bg-white/5 rounded-3xl border border-white/5 border-dashed"
             >
                <Search size={48} className="mx-auto text-gray-600 mb-4 opacity-50" />
                <div className="text-lg">لم نتمكن من العثور على رائد بهذا الاسم</div>
                <div className="text-sm mt-2 opacity-70">تأكد من كتابة الاسم بشكل صحيح</div>
             </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

    </div>
  );
}
