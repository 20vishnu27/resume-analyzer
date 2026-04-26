type SkillBarProps = {
  skill: string;
  level: number;
};

export default function SkillBar({
  skill,
  level,
}: SkillBarProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-white text-sm font-medium">
        <span>{skill}</span>
        <span>{level}%</span>
      </div>

      <div className="w-full bg-gray-700 h-3 rounded mt-1">
        <div
          className="h-3 rounded bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500"
          style={{ width: `${level}%` }}
        ></div>
      </div>
    </div>
  );
}