import React, { useState } from 'react';
import { UserProfile, ChatFolder } from '../types/tawasol';
import {
  Folder,
  FolderPlus,
  Briefcase,
  Heart,
  Users,
  Star,
  Bookmark,
  Flame,
  Coffee,
  Trash2,
  Edit2,
  Plus,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ManageFoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: ChatFolder[];
  contacts: UserProfile[];
  onSaveFolder: (folder: ChatFolder) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleContactInFolder: (folderId: string, contactNumber: string) => void;
}

const AVAILABLE_ICONS: Array<{ id: ChatFolder['icon']; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'folder', label: 'مجلد', icon: Folder },
  { id: 'briefcase', label: 'العمل', icon: Briefcase },
  { id: 'heart', label: 'العائلة', icon: Heart },
  { id: 'users', label: 'أصدقاء/مجموعات', icon: Users },
  { id: 'star', label: 'مهم/مميز', icon: Star },
  { id: 'bookmark', label: 'محفوظات', icon: Bookmark },
  { id: 'flame', label: 'عاجل/نشط', icon: Flame },
  { id: 'coffee', label: 'عام/استراحة', icon: Coffee },
];

const AVAILABLE_COLORS = [
  { id: 'blue', label: 'أزرق', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', ring: 'ring-blue-500' },
  { id: 'emerald', label: 'أخضر زمردي', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', ring: 'ring-emerald-500' },
  { id: 'purple', label: 'بنفسجي', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', ring: 'ring-purple-500' },
  { id: 'rose', label: 'وردي', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', ring: 'ring-rose-500' },
  { id: 'amber', label: 'ذهبي/برتقالي', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', ring: 'ring-amber-500' },
  { id: 'cyan', label: 'سماوي', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', ring: 'ring-cyan-500' },
];

export const ManageFoldersModal: React.FC<ManageFoldersModalProps> = ({
  isOpen,
  onClose,
  folders,
  contacts,
  onSaveFolder,
  onDeleteFolder,
  onToggleContactInFolder,
}) => {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<ChatFolder['icon']>('folder');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [searchContact, setSearchContact] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

  if (!isOpen) return null;

  const validContacts = contacts.filter((c) => c.number !== '813579' && !c.name.includes('دعم'));

  const handleStartCreate = () => {
    setEditingFolderId(null);
    setFolderName('');
    setSelectedIcon('folder');
    setSelectedColor('blue');
    setSelectedNumbers(new Set());
    setSearchContact('');
    setViewMode('editor');
  };

  const handleStartEdit = (folder: ChatFolder) => {
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setSelectedIcon(folder.icon);
    setSelectedColor(folder.color || 'blue');
    setSelectedNumbers(new Set(folder.contactNumbers || []));
    setSearchContact('');
    setViewMode('editor');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return;

    const newOrUpdatedFolder: ChatFolder = {
      id: editingFolderId || `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      icon: selectedIcon,
      color: selectedColor,
      contactNumbers: Array.from(selectedNumbers),
    };

    onSaveFolder(newOrUpdatedFolder);
    setViewMode('list');
  };

  const toggleNumberSelection = (number: string) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(number)) {
        next.delete(number);
      } else {
        next.add(number);
      }
      return next;
    });
  };

  const filteredContacts = validContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
      c.number.includes(searchContact)
  );

  const getFolderIconComponent = (iconType: ChatFolder['icon']) => {
    const found = AVAILABLE_ICONS.find((item) => item.id === iconType);
    return found ? found.icon : Folder;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-right animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تنظيم مجلدات الدردشة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono font-normal">
                  تواصل 24
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                فرز وتصنيف المحادثات (العمل، العائلة، عام، مخصص)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {viewMode === 'list' ? (
            /* View Mode: List Existing Folders */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  المجلدات الحالية ({folders.length}):
                </span>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إنشاء مجلد جديد</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {folders.map((folder) => {
                  const IconComp = getFolderIconComponent(folder.icon);
                  const isAll = folder.id === 'all';
                  const contactsCount = folder.contactNumbers ? folder.contactNumbers.length : 0;
                  const colorConfig = AVAILABLE_COLORS.find((c) => c.id === folder.color) || AVAILABLE_COLORS[0];

                  return (
                    <div
                      key={folder.id}
                      className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600/80 transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${colorConfig.bg} ${colorConfig.text} border ${colorConfig.border}`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">
                              {folder.name}
                            </span>
                            {folder.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                أساسي
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {isAll
                              ? 'يحتوي على كافة المحادثات دون استثناء'
                              : `${contactsCount} محادثة مرتبطة بهذا المجلد`}
                          </span>
                        </div>
                      </div>

                      {/* Folder Actions */}
                      {!isAll && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(folder)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700/70 rounded-xl transition"
                            title="تعديل المجلد واختيار المحادثات"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من رغبتك في حذف مجلد "${folder.name}"؟`)) {
                                onDeleteFolder(folder.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                            title="حذف المجلد"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tips Banner */}
              <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>فائدة مجلدات الدردشة:</strong> تساعدك على فصل محادثات العمل عن العائلة والأصدقاء. ستظهر لك في أعلى قائمة الدردشات كأشرطة تبويب سريعة مثل تليجرام تماماً.
                </p>
              </div>
            </div>
          ) : (
            /* View Mode: Folder Editor / Creator */
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اسم المجلد:
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="مثال: العمل، العائلة، عام، الأصدقاء..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  أيقونة المجلد:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = selectedIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIcon(item.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[11px] truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  لون تمييز المجلد:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setSelectedColor(col.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${col.bg} ${col.text} ${
                        selectedColor === col.id
                          ? `ring-2 ${col.ring} border-white/40 shadow-sm`
                          : col.border
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Chats to add into this Folder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    حدد المحادثات التي تريد إدراجها في هذا المجلد ({selectedNumbers.size}):
                  </label>
                  {validContacts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedNumbers.size === validContacts.length) {
                          setSelectedNumbers(new Set());
                        } else {
                          setSelectedNumbers(new Set(validContacts.map((c) => c.number)));
                        }
                      }}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      {selectedNumbers.size === validContacts.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  )}
                </div>

                {validContacts.length > 5 && (
                  <input
                    type="text"
                    value={searchContact}
                    onChange={(e) => setSearchContact(e.target.value)}
                    placeholder="ابحث عن جهة اتصال بالاسم أو الرقم..."
                    className="w-full mb-2 px-3 py-1.5 bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                )}

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950/40 border border-slate-800 rounded-2xl divide-y divide-slate-800/40">
                  {validContacts.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-3">
                      لا توجد جهات اتصال حتى الآن. يمكنك حفظ المجلد وإضافة المحادثات إليه لاحقاً.
                    </p>
                  ) : filteredContacts.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-2">لا توجد نتائج بحث</p>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isChecked = selectedNumbers.has(contact.number);
                      return (
                        <div
                          key={contact.number}
                          onClick={() => toggleNumberSelection(contact.number)}
                          className="pt-1.5 first:pt-0 flex items-center justify-between gap-2.5 p-1.5 rounded-xl hover:bg-slate-800/60 cursor-pointer transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={contact.avatar || '/src/assets/images/tawasol24_logo_badge_1791830208691.jpg'}
                              alt={contact.name}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white block truncate">
                                {contact.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 block">
                                {contact.number}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                              isChecked
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'border-slate-600 bg-slate-800'
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  إلغاء والعودة
                </button>
                <button
                  type="submit"
                  disabled={!folderName.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingFolderId ? 'حفظ التعديلات' : 'إنشاء المجلد'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {viewMode === 'list' && (
          <div className="p-3 bg-slate-900 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
