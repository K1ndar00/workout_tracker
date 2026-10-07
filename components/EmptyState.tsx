import { Dumbbell, Plus } from 'lucide-react';

export default function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
        <Dumbbell className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        ワークアウトを始めよう
      </h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
        最初のワークアウトを記録して、トレーニングの進捗を追跡しましょう。
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        新しいワークアウト
      </button>
    </div>
  );
}
