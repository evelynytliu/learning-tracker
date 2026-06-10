import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import CourseManager from './CourseManager';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle();

  // 家長看（並可幫忙管理）學生的課程；學生管自己的
  let targetId = user.id;
  if (profile?.role === 'parent') {
    const { data: student } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .limit(1)
      .maybeSingle();
    if (student) targetId = student.id;
  }

  const [{ data: courses }, { data: progress }] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('user_id', targetId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('course_progress')
      .select('course_id, unit_no, done_at')
      .eq('user_id', targetId),
  ]);

  return (
    <AppShell
      role={profile?.role ?? 'student'}
      email={user.email}
      displayName={profile?.display_name}
      width="narrow"
    >
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">🎓 線上課程</h1>
        <p className="mt-1 text-sm text-slate-500">
          大抓周學院等線上課的進度，看完一集就點一下——每集 +5 點數
        </p>
      </header>

      <CourseManager
        userId={targetId}
        initialCourses={courses ?? []}
        initialProgress={progress ?? []}
      />
    </AppShell>
  );
}
