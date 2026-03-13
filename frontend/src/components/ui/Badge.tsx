interface BadgeProps {
  children: React.ReactNode;
  variant?: 'deal' | 'category' | 'status';
}

const variants = {
  deal: 'bg-primary text-white',
  category: 'bg-primary-light text-primary-dark',
  status: 'bg-green-100 text-green-800',
};

export default function Badge({ children, variant = 'deal' }: BadgeProps) {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${variants[variant]}`}>
      {children}
    </span>
  );
}
