# Database Migration Required

## 🚨 **URGENT: Database Schema Update Needed**

The collection save is failing because the `saved_collections` table is missing the `logo_url` and `banner_url` columns.

## 📋 **Error Details:**
```
"Could not find the 'banner_url' column of 'saved_collections' in the schema cache"
```

## 🔧 **Solution: Apply Database Migration**

### **Option 1: Supabase Dashboard (Recommended)**

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste this SQL:**

```sql
-- Add logo_url and banner_url columns to saved_collections table
-- This migration adds the missing columns that the API is trying to use

-- Add logo_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_collections' 
        AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE public.saved_collections ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- Add banner_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'saved_collections' 
        AND column_name = 'banner_url'
    ) THEN
        ALTER TABLE public.saved_collections ADD COLUMN banner_url TEXT;
    END IF;
END $$;

-- Add comments for the new columns
COMMENT ON COLUMN public.saved_collections.logo_url IS 'URL of the collection logo image';
COMMENT ON COLUMN public.saved_collections.banner_url IS 'URL of the collection banner image';

-- Success message
SELECT 'Logo and banner URL columns added successfully to saved_collections table!' as status;
```

4. **Click "Run" to execute the migration**

### **Option 2: Test Database Connection**

After applying the migration, test the database by visiting:
```
https://www.onlyanal.fun/api/test-db
```

This will verify that:
- ✅ Database connection works
- ✅ Table structure is correct
- ✅ Insert operations work
- ✅ All columns exist

## 🎯 **After Migration:**

Once the migration is applied, the collection save functionality will work perfectly! The error will be resolved and you'll be able to save collections with logos and banners.

## 📝 **What This Migration Does:**

- **Adds `logo_url` column** to store collection logo URLs
- **Adds `banner_url` column** to store collection banner URLs
- **Uses safe migration** that won't break if columns already exist
- **Adds helpful comments** for documentation

## ⚡ **Quick Fix:**

The migration is safe to run multiple times - it will only add the columns if they don't already exist.
