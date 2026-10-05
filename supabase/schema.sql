create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'sales' check (role in ('owner', 'admin', 'sales')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'admin', 'sales'));

create table if not exists public.app_content (
  collection text not null check (collection in ('products', 'troubleshooting', 'software', 'apps', 'tutorials', 'playlists', 'product_documentation', 'ipos')),
  record_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, record_id)
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null check (length(trim(description)) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'rejected')),
  rejection_reason text,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null,
  processed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'rejected' and length(trim(coalesce(rejection_reason, ''))) > 0)
    or (status <> 'rejected' and rejection_reason is null)
  ),
  check (
    (status = 'pending' and processed_by is null)
    or (status in ('in_progress', 'rejected') and processed_by is not null)
  )
);

do $$
declare
  check_constraint record;
begin
  for check_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.requests'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%status%'
        or pg_get_constraintdef(oid) like '%processed_by%'
      )
  loop
    execute format(
      'alter table public.requests drop constraint %I',
      check_constraint.conname
    );
  end loop;
end;
$$;

alter table public.requests
  add constraint requests_status_check
  check (status in ('pending', 'in_progress', 'rejected', 'completed', 'cancelled'));

alter table public.requests
  add constraint requests_rejection_reason_check
  check (
    (status = 'rejected' and length(trim(coalesce(rejection_reason, ''))) > 0)
    or (status <> 'rejected' and rejection_reason is null)
  );

alter table public.requests
  add constraint requests_processor_check
  check (
    (status = 'pending' and processed_by is null)
    or (
      status in ('in_progress', 'rejected', 'completed', 'cancelled')
      and processed_by is not null
    )
  );

create index if not exists requests_created_at_idx
  on public.requests (created_at desc);

alter table public.app_content
  drop constraint if exists app_content_collection_check;

alter table public.app_content
  add constraint app_content_collection_check
  check (collection in ('products', 'troubleshooting', 'software', 'apps', 'tutorials', 'playlists', 'product_documentation', 'ipos'));

create index if not exists app_content_collection_created_idx
  on public.app_content (collection, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'owner'
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles as existing_profile (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email),
    case when lower(new.email) = 'krisnaadityapratamaaa@gmail.com' then 'owner' else 'sales' end
  )
  on conflict (id) do update
    set email = excluded.email,
        role = case
          when excluded.role = 'owner' then 'owner'
          when existing_profile.role = 'owner' then 'admin'
          else existing_profile.role
        end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

insert into public.profiles as existing_profile (id, name, email, role)
select
  id,
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), split_part(email, '@', 1)),
  lower(email),
  case when lower(email) = 'krisnaadityapratamaaa@gmail.com' then 'owner' else 'sales' end
from auth.users
where email is not null
on conflict (id) do update
  set email = excluded.email,
      role = case
        when excluded.role = 'owner' then 'owner'
        when existing_profile.role = 'owner' then 'admin'
        else existing_profile.role
      end;

update public.profiles
set role = 'admin'
where role = 'owner'
  and lower(email) <> 'krisnaadityapratamaaa@gmail.com';

update public.profiles
set role = 'owner'
where lower(email) = 'krisnaadityapratamaaa@gmail.com';

create unique index if not exists profiles_single_owner_idx
  on public.profiles (role)
  where role = 'owner';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists app_content_set_updated_at on public.app_content;
create trigger app_content_set_updated_at
before update on public.app_content
for each row execute procedure public.set_updated_at();

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
before update on public.requests
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.app_content enable row level security;
alter table public.requests enable row level security;

drop policy if exists "Profiles are visible to self and admins" on public.profiles;
drop policy if exists "Profiles are visible to self and owner" on public.profiles;
create policy "Profiles are visible to self and owner"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_owner()));

drop policy if exists "Authenticated users can read content" on public.app_content;
create policy "Authenticated users can read content"
on public.app_content for select to authenticated
using (true);

drop policy if exists "Admins can insert content" on public.app_content;
create policy "Admins can insert content"
on public.app_content for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists "Admins can update content" on public.app_content;
create policy "Admins can update content"
on public.app_content for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "Admins can delete content" on public.app_content;
create policy "Admins can delete content"
on public.app_content for delete to authenticated
using ((select public.is_admin()));

drop policy if exists "Authenticated users can read requests" on public.requests;
create policy "Authenticated users can read requests"
on public.requests for select to authenticated
using (true);

drop policy if exists "Sales can create requests" on public.requests;
create policy "Sales can create requests"
on public.requests for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'pending'
  and processed_by is null
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'sales'
  )
);

drop policy if exists "Admins can update requests" on public.requests;
create policy "Admins can update requests"
on public.requests for update to authenticated
using ((select public.is_admin()))
with check (
  (select public.is_admin())
  and status in ('in_progress', 'rejected', 'completed', 'cancelled')
  and processed_by = (select auth.uid())
  and (
    (status = 'rejected' and length(trim(coalesce(rejection_reason, ''))) > 0)
    or (
      status in ('in_progress', 'completed', 'cancelled')
      and rejection_reason is null
    )
  )
);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.app_content to authenticated;
grant select, insert, update on public.requests to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_owner() to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requests'
  ) then
    execute 'alter publication supabase_realtime add table public.requests';
  end if;
end;
$$;

insert into public.app_content (collection, record_id, payload)
values
  ('products', 'KAS-BTP3100', $json${
    "name":"Kassen BT-P 3100 BT","code":"KAS-BTP3100","category":"Thermal Printer","brand":"Kassen","connections":["Bluetooth","USB"],"systems":["Windows","Android"],"accent":"mint","icon":"printer","description":"Printer thermal portable untuk kebutuhan kasir dan mobile POS.","status":"Tersedia",
    "labelSupport":{"applicable":true,"demoData":true,"minWidthMm":null,"minHeightMm":null,"sensorTypes":[{"type":"GAP","supported":false,"note":"Profil demo hanya untuk kertas struk kontinu."},{"type":"MARK","supported":false,"note":"Black mark belum diverifikasi untuk printer ini."},{"type":"NOTCH","supported":false,"note":"Notch belum diverifikasi untuk printer ini."}],"sizes":[],"note":"Produk pada profil demo ini ditujukan untuk kertas struk kontinu, bukan label barcode die-cut."}
  }$json$::jsonb),
  ('products', 'CBT-58II', $json${
    "name":"CBT-58II","code":"CBT-58II","category":"Thermal Printer","brand":"Codeshop","connections":["USB","Bluetooth"],"systems":["Windows","Android"],"accent":"blue","icon":"printer","description":"Printer thermal 58 mm dengan koneksi USB dan Bluetooth.","status":"Tersedia",
    "labelSupport":{"applicable":true,"demoData":true,"minWidthMm":null,"minHeightMm":null,"sensorTypes":[{"type":"GAP","supported":false,"note":"Profil demo hanya untuk kertas struk kontinu."},{"type":"MARK","supported":false,"note":"Black mark belum diverifikasi untuk printer ini."},{"type":"NOTCH","supported":false,"note":"Notch belum diverifikasi untuk printer ini."}],"sizes":[],"note":"Produk pada profil demo ini ditujukan untuk kertas struk kontinu, bukan label barcode die-cut."}
  }$json$::jsonb),
  ('products', 'KS-603', $json${
    "name":"Kassen KS-603","code":"KS-603","category":"Barcode Scanner","brand":"Kassen","connections":["USB"],"systems":["Windows","Android"],"accent":"peach","icon":"scan","description":"Barcode scanner 2D untuk loket, retail, dan sistem POS.","status":"Tersedia",
    "labelSupport":{"applicable":false,"demoData":true,"minWidthMm":null,"minHeightMm":null,"sensorTypes":[],"sizes":[],"note":"Scanner membaca barcode dan tidak mencetak label. Pilih printer barcode untuk mengecek ukuran label."}
  }$json$::jsonb),
  ('products', 'TL-220', $json${
    "name":"Kassen TL-220","code":"TL-220","category":"Barcode Printer","brand":"Kassen","connections":["USB","Ethernet"],"systems":["Windows"],"accent":"lavender","icon":"tag","description":"Printer barcode desktop untuk pencetakan label harian.","status":"Tersedia",
    "labelSupport":{"applicable":true,"demoData":true,"minWidthMm":20,"minHeightMm":10,"sensorTypes":[{"type":"GAP","supported":true,"note":"Jarak antar label dibaca sensor."},{"type":"MARK","supported":true,"note":"Black mark dapat digunakan sebagai acuan."},{"type":"NOTCH","supported":false,"note":"Belum didukung pada profil demo ini."}],"sizes":[{"widthMm":33,"heightMm":13,"lines":1,"barcodeType":"Code 128 / EAN-13","supported":true,"note":"Ukuran label standar."},{"widthMm":33,"heightMm":13,"lines":2,"barcodeType":"Code 128 + teks","supported":true,"note":"Sisakan ruang untuk teks."},{"widthMm":33,"heightMm":13,"lines":3,"barcodeType":"Code 128 + 2 teks","supported":false,"note":"Area cetak tidak mencukupi."},{"widthMm":33,"heightMm":20,"lines":1,"barcodeType":"QR / Code 128","supported":true,"note":"QR dan barcode 1D."},{"widthMm":33,"heightMm":20,"lines":2,"barcodeType":"Code 128 + teks","supported":true,"note":"Gunakan margin label."},{"widthMm":40,"heightMm":30,"lines":3,"barcodeType":"QR + teks","supported":true,"note":"Atur tinggi baris pada template."},{"widthMm":50,"heightMm":30,"lines":4,"barcodeType":"Barcode + 3 teks","supported":false,"note":"Jumlah baris melebihi profil demo."}],"note":"Contoh konfigurasi untuk demo UI. Verifikasi dengan datasheet dan uji cetak printer sebelum diberikan ke customer."}
  }$json$::jsonb),
  ('troubleshooting', 'issue-printer-paper', $json${"id":"issue-printer-paper","title":"Printer tidak keluar kertas","category":"Printer","level":"Umum","cause":"Posisi kertas tidak tepat, sensor paper tertutup, atau ukuran kertas pada driver tidak sesuai.","steps":["Pastikan kertas thermal terpasang dengan sisi cetak menghadap head printer.","Bersihkan sensor paper dan pastikan tidak ada sisa kertas yang tersangkut.","Cocokkan ukuran kertas pada pengaturan driver dengan roll yang digunakan.","Tekan tombol FEED untuk melakukan test print."]}$json$::jsonb),
  ('troubleshooting', 'issue-bluetooth', $json${"id":"issue-bluetooth","title":"Printer Bluetooth tidak terhubung","category":"Koneksi","level":"Umum","cause":"Printer masih terhubung ke perangkat lain, Bluetooth belum aktif, atau pairing perlu diulang.","steps":["Pastikan printer menyala dan indikator Bluetooth berkedip.","Hapus perangkat printer dari daftar Bluetooth perangkat Android.","Matikan lalu nyalakan kembali Bluetooth pada perangkat.","Pair kembali printer melalui pengaturan Bluetooth.","Pilih printer yang sama dari aplikasi POS atau aplikasi cetak."]}$json$::jsonb),
  ('troubleshooting', 'issue-scanner-pos', $json${"id":"issue-scanner-pos","title":"Scanner tidak terbaca di aplikasi POS","category":"Scanner","level":"Menengah","cause":"Mode koneksi scanner, kabel USB, atau fokus input pada aplikasi POS belum sesuai.","steps":["Cabut dan pasang kembali kabel USB scanner.","Pastikan kursor berada pada kolom input barcode di aplikasi POS.","Scan barcode konfigurasi untuk mengembalikan mode USB HID."]}$json$::jsonb),
  ('software', 'software-printer-driver', $json${"id":"software-printer-driver","name":"Kassen Printer Driver","description":"Driver printer thermal untuk instalasi dan pencetakan dari Windows.","category":"Printer Driver","platform":"Windows","version":"Terbaru","downloadUrl":"","documentationUrl":"","supportedProducts":"Thermal Printer","createdAt":"2026-09-29T00:00:00.000Z"}$json$::jsonb),
  ('software', 'software-pos-utility', $json${"id":"software-pos-utility","name":"POS Printer Utility","description":"Konfigurasi printer POS dan lakukan test print.","category":"Utility","platform":"Windows","version":"Terbaru","downloadUrl":"","documentationUrl":"","supportedProducts":"Printer POS","createdAt":"2026-09-29T00:00:00.000Z"}$json$::jsonb),
  ('software', 'software-barcode-editor', $json${"id":"software-barcode-editor","name":"Barcode Label Editor","description":"Buat dan cetak desain label barcode.","category":"Label Software","platform":"Windows","version":"Terbaru","downloadUrl":"","documentationUrl":"","supportedProducts":"Barcode Printer","createdAt":"2026-09-29T00:00:00.000Z"}$json$::jsonb),
  ('playlists', 'playlist-ipos-5', $json${
    "id":"playlist-ipos-5","title":"Tutorial iPOS 5","description":"Panduan berurutan untuk instalasi, pengaturan, dan penggunaan awal aplikasi iPOS 5.","category":"IPOS 5","lessons":[
      {"id":"ipos-install","title":"Cara Install iPOS 5","description":"Persiapan perangkat dan langkah instalasi awal aplikasi iPOS 5.","url":"","duration":"8 menit"},
      {"id":"ipos-activation","title":"Aktivasi dan registrasi","description":"Panduan aktivasi aplikasi setelah proses instalasi selesai.","url":"","duration":"5 menit"},
      {"id":"ipos-first-setup","title":"Pengaturan awal & data usaha","description":"Atur profil usaha, pengguna, dan preferensi dasar sebelum mulai transaksi.","url":"","duration":"7 menit"},
      {"id":"ipos-printer","title":"Setting printer kasir","description":"Hubungkan printer struk dan lakukan cetak uji dari iPOS 5.","url":"","duration":"6 menit"},
      {"id":"ipos-backup","title":"Backup dan restore database","description":"Simpan cadangan data dan pulihkan database saat diperlukan.","url":"","duration":"5 menit"}
    ]
  }$json$::jsonb),
  ('ipos', 'ipos-install', $json${"id":"ipos-install","title":"Instalasi","text":"Unduh installer IPOS 5 dari portal resmi, jalankan sebagai administrator, lalu ikuti instruksi pada layar. Pastikan komputer memenuhi spesifikasi minimum sebelum instalasi."}$json$::jsonb),
  ('ipos', 'ipos-activation', $json${"id":"ipos-activation","title":"Aktivasi","text":"Buka menu aktivasi dari aplikasi IPOS, masukkan kode lisensi yang diberikan saat pembelian, lalu pastikan perangkat terhubung ke internet."}$json$::jsonb),
  ('ipos', 'ipos-license', $json${"id":"ipos-license","title":"Lisensi","text":"Informasi lisensi tersedia pada akun pembelian Anda. Untuk bantuan pemindahan lisensi ke perangkat lain, hubungi tim support Codeshop."}$json$::jsonb),
  ('ipos', 'ipos-database', $json${"id":"ipos-database","title":"Database","text":"Lakukan backup database secara berkala melalui menu Pengaturan > Backup. Simpan file backup di lokasi yang aman."}$json$::jsonb),
  ('ipos', 'ipos-troubleshooting', $json${"id":"ipos-troubleshooting","title":"Troubleshooting","text":"Jika aplikasi tidak dapat dibuka, periksa koneksi database, hak akses aplikasi, dan pastikan Windows telah diperbarui."}$json$::jsonb)
on conflict (collection, record_id) do nothing;
