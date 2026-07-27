# Crown Construction (Home Counties) Ltd — website

A plain HTML/CSS/JS site for GitHub Pages, with a built-in admin panel at
`/admin/` for editing text, photos and project listings without touching code.

No build step, no framework, no server — GitHub Pages serves the files as-is,
and the admin panel publishes changes by committing directly to this repo.

## 1. Put it on GitHub

```bash
cd crown-construction
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 2. Turn on GitHub Pages

1. On GitHub, go to your repo → **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`. Save.
4. GitHub gives you a `https://YOUR-USERNAME.github.io/YOUR-REPO/` URL — wait
   a minute or two for the first build.

## 3. Point crownconstructionltd.co.uk at it

This repo already includes a `CNAME` file containing `crownconstructionltd.co.uk`,
which tells GitHub Pages to serve on that domain.

At your domain registrar, add these DNS records (exact values from
[GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)):

- **A records** for the apex domain (`crownconstructionltd.co.uk`) pointing at
  GitHub's four Pages IPs: `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`
- Or a **CNAME record** for `www` pointing at `YOUR-USERNAME.github.io`

Then in **Settings → Pages**, confirm the custom domain and tick **Enforce HTTPS**
once it's available (can take a few hours after DNS updates).

## 4. Set up the contact form

The contact form needs somewhere to send emails to, since GitHub Pages can't
run server code. The easiest option is [Formspree](https://formspree.io) (free
tier covers a small business's enquiry volume):

1. Create a free Formspree account and a new form.
2. Copy the **form ID** (the part after `/f/` in your form's endpoint).
3. Open `/admin/` on your live site → **Site & contact** tab → paste it into
   **Formspree form ID** → **Publish changes**.

Until that's set, the form will show a message asking visitors to email or
call directly — the phone and email on the site work immediately either way.

## 5. Using the admin panel

Go to `https://crownconstructionltd.co.uk/admin/`. You'll need:

- Your GitHub username and this repository's name
- A **fine-grained personal access token** scoped to just this repo, with
  **Contents: Read and write** permission
  (GitHub → your avatar → Settings → Developer settings → Personal access
  tokens → Fine-grained tokens → Generate new token)

The token is stored only in your browser (`localStorage`) — it's never sent
anywhere except to GitHub's API when you publish. Use **Log out** in the
admin panel if you're on a shared computer.

From the admin panel you can edit:

- Contact details, phone/email, opening hours, areas covered, and the logo
- The homepage headline and intro text
- The six service cards
- The "why choose us" reasons
- Client testimonials
- The project gallery — add/remove projects and upload real photos to
  replace the "photo coming soon" placeholders
- The About page story and values

Nothing goes live until you press **Publish changes**, which commits
`data/content.json` (and any new photos) straight to this repo. GitHub Pages
then rebuilds the live site automatically, usually within a minute or two.

## Project structure

```
index.html          Homepage
gallery.html         Our work / project gallery
about.html            About page
contact.html          Contact page + enquiry form
admin/                 Content manager (edits data/content.json via GitHub API)
data/content.json       All editable site text, services, projects, testimonials
css/style.css            Design system
js/                        Page behaviour (content loading, nav, forms, gallery filter)
images/                  Logo + gallery photos
```

## Replacing the placeholder content

The site ships with realistic example copy and six sample projects using
"photo coming soon" placeholder graphics so it looks complete on day one.
Replace them with real details and photos any time via `/admin/` — no code
changes needed.
