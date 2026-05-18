// Yearly wraps feature not yet implemented — redirect until generation pipeline is built (FEAT-V2-01)
import { redirect } from 'next/navigation';

export default function WrapPage() {
  redirect('/trips');
}
