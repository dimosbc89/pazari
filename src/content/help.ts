// "About Tagora" and "Help for shops": public text pages.
// The shop help describes what the sync engine (sync/) really does: keep it in step
// with sync/feed.ts, sync/normalize.ts, sync/shopify.ts and sync/woocommerce.ts.
// Text supports **bold**, [links](/path) and [PLACEHOLDERS] (see src/pages/Legal.tsx).
import type { LegalPage } from './legal';

export const aboutPage: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Σχετικά με το Tagora',
    updated: 'Τελευταία ενημέρωση: 3 Νοεμβρίου 2026',
    intro: 'Το Tagora είναι ιστότοπος σύγκρισης τιμών για την Ελλάδα και την Κύπρο. Με μία αναζήτηση βλέπεις το ίδιο προϊόν σε πολλά ελληνικά online καταστήματα και συγκρίνεις την τιμή του μαζί με τα μεταφορικά.',
    blocks: [
      { type: 'h2', text: 'Το όνομα' },
      { type: 'p', text: 'Tagora σημαίνει **tag**, η ετικέτα με την τιμή (price tag), και **αγορά**, όπως η αρχαία ελληνική αγορά. Είναι η αγορά όπου συναντιούνται οι ετικέτες τιμών όλων των καταστημάτων.' },

      { type: 'h2', text: 'Πώς λειτουργεί' },
      {
        type: 'ul',
        items: [
          '**Ψάχνεις.** Γράφεις μία φορά αυτό που θέλεις και ψάχνουμε σε όλα τα συνεργαζόμενα καταστήματα.',
          '**Συγκρίνεις.** Στη σελίδα του προϊόντος βλέπεις το ίδιο προϊόν σε κάθε κατάστημα που το έχει, με σειρά από την τιμή μαζί με τα μεταφορικά. Η φθηνότερη προσφορά έχει την ένδειξη «Καλύτερη τιμή».',
          '**Αγοράζεις από το κατάστημα.** Με ένα κλικ πας στο προϊόν, στον ιστότοπο του καταστήματος, και εκεί παραγγέλνεις και πληρώνεις.',
        ],
      },
      { type: 'p', text: 'Το Tagora δεν πουλά προϊόντα, δεν παίρνει παραγγελίες και δεν εισπράττει πληρωμές. Την παραγγελία, την αποστολή και τις επιστροφές τις αναλαμβάνει το κατάστημα. Το Tagora είναι δωρεάν για σένα και δεν χρειάζεσαι λογαριασμό για να ψάξεις.' },

      { type: 'h2', text: 'Δίκαιη σειρά' },
      { type: 'p', text: '**Κανένα κατάστημα δεν μπορεί να πληρώσει για να εμφανιστεί πιο ψηλά.** Η σειρά των αποτελεσμάτων εξαρτάται από το πόσο ταιριάζει κάθε προϊόν με αυτό που έψαξες ή από την ταξινόμηση που διαλέγεις. Στη σελίδα του προϊόντος πρώτο έρχεται το χαμηλότερο σύνολο. Τα εξηγούμε αναλυτικά στο [πώς κατατάσσουμε τα αποτελέσματα](/pages/ranking).' },
      { type: 'p', text: 'Το Tagora είναι επίσης υπηρεσία σύγκρισης αγορών (CSS) για το Google Shopping, οπότε μπορεί να προβάλλει διαφημίσεις Shopping των καταστημάτων στο Google. Αυτή είναι ξεχωριστή υπηρεσία για τα καταστήματα και δεν επηρεάζει τη σειρά των αποτελεσμάτων στο Tagora.' },

      { type: 'h2', text: 'Για καταστήματα' },
      { type: 'p', text: 'Τα καταστήματα κάνουν αίτηση μόνα τους στη [σελίδα για καταστήματα](/shops). Συνδέουν τον κατάλογό τους μία φορά και οι τιμές και η διαθεσιμότητα ενημερώνονται αυτόματα περίπου κάθε 6 ώρες. Πώς γίνεται η σύνδεση, θα το βρεις στη [βοήθεια για καταστήματα](/pages/shop-help).' },

      { type: 'h2', text: 'Ποιοι είμαστε' },
      { type: 'p', text: 'Το Tagora το λειτουργεί η **[COMPANY LEGAL NAME]**, εταιρεία ψηφιακών υπηρεσιών ([growagency.online](https://growagency.online)).' },
      { type: 'ul', items: ['**Διεύθυνση:** [ADDRESS]', '**ΓΕΜΗ:** [GEMI NUMBER]', '**ΑΦΜ:** [VAT NUMBER]', '**Email:** [CONTACT EMAIL]', '**Τηλέφωνο:** [CUSTOMER SERVICE PHONE]'] },
      { type: 'p', text: 'Μπορείς να μας γράψεις και από τη σελίδα [επικοινωνίας](/pages/contact).' },
    ],
  },
  en: {
    title: 'About Tagora',
    updated: 'Last updated: 3 November 2026',
    intro: 'Tagora is a price comparison site for Greece and Cyprus. With one search you see the same product across many Greek online shops and compare its price including delivery.',
    blocks: [
      { type: 'h2', text: 'The name' },
      { type: 'p', text: 'Tagora is **tag**, as in price tag, plus **agora**, the marketplace of ancient Greece. It is the market where every shop’s price tags meet.' },

      { type: 'h2', text: 'How it works' },
      {
        type: 'ul',
        items: [
          '**Search.** Type what you are looking for once, and we search all our partner shops.',
          '**Compare.** A product page shows the same product in every shop that has it, sorted by price including delivery. The cheapest offer is marked “Best price”.',
          '**Buy at the shop.** One click takes you to the product on the shop’s own website, where you order and pay.',
        ],
      },
      { type: 'p', text: 'Tagora does not sell products and does not take orders or payments. The shop handles your order, delivery and returns. Tagora is free for you, and you do not need an account to search.' },

      { type: 'h2', text: 'Fair ranking' },
      { type: 'p', text: '**No shop can pay to rank higher.** Results are ordered by how well each product matches your search, or by the sort you choose, and on a product page the lowest total comes first. [How we rank results](/pages/ranking) explains it in full.' },
      { type: 'p', text: 'Tagora is also a Comparison Shopping Service (CSS) for Google Shopping, so we can run shops’ Shopping ads on Google. That is a separate service for shops and does not affect the order of results on Tagora.' },

      { type: 'h2', text: 'For shops' },
      { type: 'p', text: 'Shops apply on their own on our [page for shops](/shops). They connect their catalogue once, and prices and stock then update automatically about every 6 hours. [Help for shops](/pages/shop-help) explains how to connect.' },

      { type: 'h2', text: 'Who we are' },
      { type: 'p', text: 'Tagora is run by **[COMPANY LEGAL NAME]**, a digital agency ([growagency.online](https://growagency.online)).' },
      { type: 'ul', items: ['**Address:** [ADDRESS]', '**Company register (GEMI):** [GEMI NUMBER]', '**VAT:** [VAT NUMBER]', '**Email:** [CONTACT EMAIL]', '**Phone:** [CUSTOMER SERVICE PHONE]'] },
      { type: 'p', text: 'You can also write to us through the [contact page](/pages/contact).' },
    ],
  },
};

export const shopHelpPage: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Βοήθεια για καταστήματα',
    updated: 'Τελευταία ενημέρωση: 3 Νοεμβρίου 2026',
    intro: 'Πώς συνδέεις τα προϊόντα σου με το Tagora, τι χρειάζεται κάθε προϊόν και τι γίνεται μετά την έγκριση. Αν κολλήσεις κάπου, [γράψε μας](/pages/contact).',
    blocks: [
      { type: 'h2', text: '1. Τέσσερις τρόποι σύνδεσης' },
      { type: 'p', text: 'Στη [σελίδα για καταστήματα](/shops) διαλέγεις πώς συνδέεται το κατάστημά σου:' },
      {
        type: 'table',
        head: ['Τρόπος', 'Τι μας δίνεις', 'Πότε ταιριάζει'],
        rows: [
          ['**XML feed**', 'Το link του feed σου (XML, CSV ή TSV)', 'Έχεις ήδη feed για Skroutz, BestPrice ή Google, ή μπορεί να σου φτιάξει ένα η πλατφόρμα του e-shop σου. **Αυτό προτείνουμε.**'],
          ['**Shopify**', 'Τη διεύθυνση του καταστήματός σου', 'Δεν έχεις feed και θέλεις να ξεκινήσεις γρήγορα.'],
          ['**WooCommerce**', 'Τη διεύθυνση του καταστήματός σου', 'Δεν έχεις feed και θέλεις να ξεκινήσεις γρήγορα.'],
          ['**WooCommerce plugin**', 'Τίποτα: εγκαθιστάς το plugin και βάζεις το κλειδί σύνδεσης', 'Έχεις WooCommerce. **Αυτό προτείνουμε για WooCommerce**: στέλνει barcode, MPN και μάρκες, ενημερώνει αμέσως και δουλεύει πίσω από firewall (δες την ενότητα 4).'],
        ],
      },
      { type: 'p', text: '**Προτείνουμε το XML feed**, γιατί συνήθως έχει barcode (EAN) και κωδικό κατασκευαστή (MPN). Αυτά βάζουν τα προϊόντα σου στη σύγκριση τιμών, δίπλα στο ίδιο προϊόν από άλλα καταστήματα. Ένα feed μπορεί να έχει και κόστος αποστολής για κάθε προϊόν. Οι λίστες προϊόντων του Shopify και του WooCommerce δεν έχουν κόστος αποστολής και συνήθως ούτε barcode, οπότε τα προϊόντα σου εμφανίζονται στην αναζήτηση, αλλά κατά κανόνα όχι στη σύγκριση τιμών.' },
      { type: 'p', text: 'Μπορείς να ξεκινήσεις με Shopify ή WooCommerce και να περάσεις σε feed αργότερα, από τον πίνακα καταστήματος, στο «Σύνδεση και αποστολή».' },

      { type: 'h2', text: '2. Πού βρίσκεις το link του feed' },
      {
        type: 'ul',
        items: [
          '**Είσαι ήδη στο Skroutz ή στο BestPrice;** Βάλε το ίδιο link που έχεις δώσει εκεί. Δουλεύει όπως είναι. Συνήθως το φτιάχνει η πλατφόρμα του e-shop σου ή ένα πρόσθετο (plugin). Αν δεν ξέρεις το link, ζήτησέ το από τον developer σου ή από την υποστήριξη της πλατφόρμας σου.',
          '**Έχεις Google Merchant Center;** Αν το Merchant Center παίρνει τα προϊόντα σου από ένα link, το ίδιο link (το feed σου για το Google Shopping) δουλεύει και εδώ.',
          '**Δεν έχεις feed;** Αρκεί ένα αρχείο CSV ή TSV με στήλες όπως του Google (δες παρακάτω). Πρέπει να είναι online σε σταθερή διεύθυνση και να το κρατάς ενημερωμένο, γιατί το ξαναδιαβάζουμε σε κάθε συγχρονισμό.',
        ],
      },
      { type: 'p', text: 'Το link πρέπει να ανοίγει χωρίς κωδικό και να οδηγεί στο ίδιο το αρχείο, όχι σε ιστοσελίδα. Άνοιξέ το στον browser: πρέπει να δεις XML ή κείμενο σε στήλες.' },
      { type: 'h3', text: 'Ποια ονόματα πεδίων αναγνωρίζουμε' },
      { type: 'p', text: 'Βρίσκουμε κάθε πεδίο από το όνομά του, οπότε τα περισσότερα feeds δουλεύουν χωρίς αλλαγές. Κεφαλαία ή μικρά δεν έχουν σημασία, ούτε το πρόθεμα g: των feeds του Google. Τα ονόματα του Google Shopping που διαβάζουμε: id, title, description, link, image_link, additional_image_link, price, sale_price, availability, brand, gtin, mpn, item_group_id, color, size, product_type ή google_product_category, και shipping.' },
      { type: 'p', text: 'Αναγνωρίζουμε και τα συνηθισμένα εναλλακτικά ονόματα, όπως name για τον τίτλο, url για το link, image για την εικόνα, price_with_vat για την τιμή, manufacturer για τη μάρκα, ean ή barcode για το barcode και quantity για το απόθεμα. Γι’ αυτό τα feeds για Skroutz και BestPrice δουλεύουν όπως είναι.' },
      { type: 'p', text: 'Σε αρχείο CSV ή TSV η πρώτη γραμμή πρέπει να έχει τα ονόματα των στηλών. Οι στήλες μπορούν να χωρίζονται με κόμμα, με ; με | ή με tab.' },

      { type: 'h2', text: '3. Shopify' },
      { type: 'p', text: 'Γράφεις μόνο τη διεύθυνση του καταστήματός σου, π.χ. https://to-katastima-sou.gr. Διαβάζουμε τη δημόσια λίστα προϊόντων του καταστήματος Shopify. Δεν εγκαθιστάς εφαρμογή και δεν μας δίνεις κωδικούς.' },
      {
        type: 'ul',
        items: [
          'Κάθε παραλλαγή (π.χ. χρώμα ή μέγεθος) γίνεται ξεχωριστή προσφορά, με link κατευθείαν σε αυτήν.',
          'Μάρκα είναι ο προμηθευτής (Vendor) του προϊόντος και κατηγορία ο τύπος προϊόντος (Product type). Χρώμα και μέγεθος παίρνουμε από επιλογές με όνομα Χρώμα ή Color και Μέγεθος ή Size.',
          'Αν η τιμή σύγκρισης (Compare-at price) είναι μεγαλύτερη από την τιμή, τη δείχνουμε ως παλιά τιμή.',
          'Η λίστα δεν έχει κόστος αποστολής και συνήθως ούτε barcode. Συμπλήρωσε το κόστος αποστολής στην αίτηση. Για σύγκριση τιμών χρειάζεσαι XML feed.',
          'Αν το κατάστημα έχει κωδικό πρόσβασης (π.χ. πριν ανοίξει) ή έχει κλειστή τη λίστα προϊόντων, δεν μπορούμε να το διαβάσουμε. Τότε χρειάζεσαι XML feed.',
          'Διαβάζουμε έως 25.000 προϊόντα.',
        ],
      },

      { type: 'h2', text: '4. WooCommerce' },
      { type: 'p', text: '**Με το Tagora plugin (προτείνεται).** Το κατάστημά σου στέλνει μόνο του τα προϊόντα στο Tagora: κάθε παραλλαγή (χρώμα, μέγεθος) ως ξεχωριστή προσφορά, με barcode (EAN), MPN, μάρκα, τιμή προσφοράς και απόθεμα. Όταν αλλάζεις ένα προϊόν, η αλλαγή φτάνει στο Tagora μέσα σε ένα λεπτό, και κάθε 6 ώρες στέλνεται ολόκληρος ο κατάλογος. Δουλεύει και πίσω από firewall ή Cloudflare, γιατί δεν χρειάζεται να διαβάσουμε εμείς το site σου.' },
      {
        type: 'ul',
        items: [
          'Κάνε [αίτηση](/shops) και διάλεξε «WooCommerce plugin». Στο τέλος θα δεις το κλειδί σύνδεσης (το φτιάχνεις ξανά όποτε θέλεις από τον πίνακα καταστήματος).',
          '[Κατέβασε το plugin](/downloads/tagora-woocommerce.zip) και ανέβασέ το στο WordPress: Πρόσθετα → Προσθήκη νέου → Μεταφόρτωση πρόσθετου. Ενεργοποίησέ το.',
          'Στο WooCommerce → Tagora, επικόλλησε το κλειδί και πάτησε «Σύνδεση». Τα προϊόντα σου στέλνονται αμέσως και εμφανίζονται μόλις εγκριθεί η αίτηση.',
          'Το barcode το βρίσκουμε στο πεδίο GTIN/EAN του WooCommerce και στα πεδία των πιο γνωστών plugins για EAN, τη μάρκα στις μάρκες (Brands) του WooCommerce και των γνωστών plugins. Αν τα δικά σου είναι αλλού, δήλωσέ τα στο WooCommerce → Tagora → «Για προχωρημένους».',
          'Στέλνουμε μόνο δεδομένα προϊόντων, ποτέ πελάτες ή παραγγελίες.',
        ],
      },
      { type: 'p', text: '**Χωρίς plugin.** Γράφεις μόνο τη διεύθυνση του καταστήματός σου. Διαβάζουμε το Store API, μια δημόσια λίστα προϊόντων που είναι ενσωματωμένη στο WooCommerce. Δεν εγκαθιστάς πρόσθετο (plugin) και δεν μας δίνεις κλειδιά API.' },
      {
        type: 'ul',
        items: [
          'Κάθε προϊόν γίνεται μία προσφορά. Στα μεταβλητά προϊόντα (με παραλλαγές) δείχνουμε τη χαμηλότερη τιμή.',
          'Τη μάρκα την παίρνουμε από τις μάρκες (Brands) του WooCommerce ή από ιδιότητα (attribute) με όνομα Μάρκα, Brand, Κατασκευαστής ή Manufacturer. Χρώμα και μέγεθος παίρνουμε από ιδιότητες με όνομα Χρώμα ή Color και Μέγεθος ή Size, όταν το προϊόν έχει μία μόνο τιμή.',
          'Αν η κανονική τιμή είναι μεγαλύτερη από την τιμή προσφοράς, τη δείχνουμε ως παλιά τιμή.',
          'Το Store API δεν έχει barcode, MPN ούτε κόστος αποστολής, οπότε τα προϊόντα σου εμφανίζονται στην αναζήτηση αλλά όχι στη σύγκριση τιμών. Συμπλήρωσε το κόστος αποστολής στην αίτηση. Για σύγκριση τιμών χρειάζεσαι XML feed.',
          'Αν ένα πρόσθετο ασφαλείας ή ένα firewall μπλοκάρει το Store API, ο έλεγχος θα πει ότι δεν μοιάζει με κατάστημα WooCommerce. Ζήτα από όποιον τα διαχειρίζεται να επιτρέπει τις κλήσεις στο /wp-json/wc/store/ από το TagoraBot, το όνομα με το οποίο εμφανίζονται οι κλήσεις μας.',
          'Διαβάζουμε έως 30.000 προϊόντα.',
        ],
      },

      { type: 'h2', text: '5. Τι χρειάζεται κάθε προϊόν' },
      { type: 'p', text: 'Ένα προϊόν χωρίς κάποιο υποχρεωτικό πεδίο μένει εκτός μέχρι να το διορθώσεις. Τα προτεινόμενα πεδία δεν είναι υποχρεωτικά, αλλά χωρίς αυτά το προϊόν δείχνει λιγότερα ή μένει έξω από τη σύγκριση τιμών.' },
      {
        type: 'table',
        head: ['Πεδίο (όνομα στο feed)', 'Χρειάζεται;', 'Γιατί'],
        rows: [
          ['**Κωδικός** (id)', 'Ναι', 'Ξεχωρίζει τα προϊόντα σου μεταξύ τους. Κάθε προϊόν και κάθε παραλλαγή χρειάζεται δικό της κωδικό, που καλό είναι να μένει ίδιος.'],
          ['**Τίτλος** (title)', 'Ναι', 'Με αυτόν σε βρίσκουν οι αγοραστές. Μετράει περισσότερο από κάθε άλλο πεδίο στην αναζήτηση.'],
          ['**Τιμή** (price)', 'Ναι', 'Η τελική τιμή με ΦΠΑ, πάνω από 0.'],
          ['**Link** (link)', 'Ναι', 'Η σελίδα του προϊόντος στο κατάστημά σου, πλήρης διεύθυνση με https:// ή http://. Εκεί πηγαίνει ο αγοραστής για να αγοράσει.'],
          ['**Διαθεσιμότητα** (availability)', 'Προτείνεται', 'Τα εξαντλημένα μένουν εκτός. Χωρίς αυτό το πεδίο θεωρούμε ότι το προϊόν είναι διαθέσιμο.'],
          ['**Εικόνα** (image_link)', 'Προτείνεται', 'Οι αγοραστές θέλουν να βλέπουν τι αγοράζουν. Χωρίς εικόνα το προϊόν εμφανίζεται, αλλά βγαίνει προειδοποίηση. Περισσότερες φωτογραφίες μπαίνουν στο additional_image_link.'],
          ['**Μάρκα** (brand)', 'Προτείνεται', 'Χρειάζεται για την αντιστοίχιση με MPN και για το φίλτρο μάρκας. Χωρίς μάρκα δείχνουμε το όνομα του καταστήματός σου.'],
          ['**Barcode** (gtin)', 'Προτείνεται', 'Βάζει το προϊόν στη σύγκριση τιμών: ίδιο barcode, ίδιο προϊόν.'],
          ['**Κωδικός κατασκευαστή** (mpn)', 'Προτείνεται, αν δεν έχεις barcode', 'Μαζί με τη μάρκα βάζει το προϊόν στη σύγκριση τιμών.'],
          ['**Κατηγορία** (product_type ή google_product_category)', 'Προτείνεται', 'Για το φίλτρο κατηγορίας. Γράψε τη διαδρομή με λέξεις, π.χ. Σπίτι > Κουζίνα > Κατσαρόλες· κρατάμε το τελευταίο κομμάτι. Τους αριθμούς κατηγοριών του Google δεν τους χρησιμοποιούμε.'],
          ['**Περιγραφή** (description)', 'Προτείνεται', 'Εμφανίζεται στη σελίδα του προϊόντος και μετράει λίγο στην αναζήτηση.'],
          ['**Χρώμα, μέγεθος** (color, size)', 'Προαιρετικό', 'Για τα φίλτρα χρώματος και μεγέθους. Το χρώμα μετράει και στην αναζήτηση.'],
          ['**Ομάδα παραλλαγών** (item_group_id)', 'Προαιρετικό', 'Ενώνει τα χρώματα ή τα μεγέθη του ίδιου προϊόντος. Η πρώτη παραλλαγή στο feed σου μετράει ως η βασική.'],
          ['**Τιμή προσφοράς** (sale_price)', 'Προαιρετικό', 'Όταν είναι χαμηλότερη από το price, τη δείχνουμε ως τιμή και το price ως παλιά τιμή.'],
          ['**Κόστος αποστολής** (shipping)', 'Προαιρετικό', 'Η σύγκριση τιμών γίνεται με την τιμή μαζί με τα μεταφορικά. Αν λείπει, χρησιμοποιούμε όσα δήλωσες στην αίτηση.'],
        ],
      },

      { type: 'h2', text: '6. Το κουμπί «Έλεγχος»' },
      { type: 'p', text: 'Στην αίτηση, μόλις γράψεις τη διεύθυνση του feed ή του καταστήματος, πάτα «Έλεγχος». Διαβάζουμε τα προϊόντα σου εκείνη τη στιγμή και σου δείχνουμε πόσα είναι έτοιμα για το Tagora, πόσα διαβάσαμε και σε ποια μορφή, μερικά προϊόντα ως δείγμα και τι χρειάζεται προσοχή. Η αίτηση στέλνεται όταν τουλάχιστον ένα προϊόν περνά τον έλεγχο.' },
      { type: 'p', text: 'Τα ίδια μηνύματα βλέπεις μετά από κάθε συγχρονισμό στον πίνακα καταστήματος, στο «Τι χρειάζεται προσοχή». Τι σημαίνουν:' },
      {
        type: 'table',
        head: ['Μήνυμα', 'Τι γίνεται', 'Τι κάνεις'],
        rows: [
          ['«χωρίς κωδικό προϊόντος»', '**Μένουν εκτός**', 'Δώσε κωδικό (id) σε κάθε προϊόν.'],
          ['«χωρίς τίτλο»', '**Μένουν εκτός**', 'Συμπλήρωσε τίτλο.'],
          ['«χωρίς τιμή»', '**Μένουν εκτός**', 'Βάλε τιμή πάνω από 0.'],
          ['«χωρίς σωστό link»', '**Μένουν εκτός**', 'Βάλε την πλήρη διεύθυνση της σελίδας του προϊόντος, με https://.'],
          ['«με διπλό κωδικό»', '**Μένουν εκτός**, εκτός από το πρώτο', 'Δώσε δικό του κωδικό σε κάθε προϊόν και κάθε παραλλαγή.'],
          ['«εξαντλημένα (δεν εμφανίζονται)»', 'Δεν εμφανίζονται όσο είναι εξαντλημένα', 'Τίποτα. Επιστρέφουν με τον επόμενο συγχρονισμό, μόλις ξαναμπούν σε απόθεμα.'],
          ['«χωρίς εικόνα»', 'Εμφανίζονται χωρίς εικόνα', 'Πρόσθεσε image_link με πλήρη διεύθυνση.'],
          ['«χωρίς μάρκα (μπαίνει το όνομα του καταστήματος)»', 'Εμφανίζονται με μάρκα το όνομα του καταστήματός σου', 'Πρόσθεσε brand.'],
          ['«χωρίς barcode (EAN) ή MPN: δεν μπαίνουν στη σύγκριση τιμών»', 'Εμφανίζονται στην αναζήτηση, όχι στη σύγκριση τιμών', 'Πρόσθεσε gtin, ή brand μαζί με mpn.'],
          ['«πολύ μεγάλος κατάλογος: διαβάστηκε μέχρι το όριο»', 'Όσα προϊόντα είναι πέρα από το όριο μένουν εκτός', 'Σύνδεσε το κατάστημα με XML feed.'],
        ],
      },
      { type: 'p', text: 'Τα μηνύματα με κόκκινο αφορούν προϊόντα που μένουν εκτός μέχρι να τα διορθώσεις στο feed ή στο κατάστημά σου. Τα άλλα είναι προειδοποιήσεις ή πληροφορίες.' },
      { type: 'h3', text: 'Αν ο έλεγχος αποτύχει' },
      {
        type: 'ul',
        items: [
          '«Αυτή η διεύθυνση είναι ιστοσελίδα, όχι XML feed.» Έβαλες μια σελίδα του καταστήματός σου. Βάλε το link του ίδιου του αρχείου.',
          '«Η διεύθυνση απάντησε με σφάλμα.» Άνοιξε το link στον browser και δες αν ανοίγει χωρίς σύνδεση με κωδικό.',
          '«Η διεύθυνση άργησε πολύ να απαντήσει.» Δοκίμασε ξανά σε λίγο. Αν συνεχίζει, ζήτα από τον developer σου να δει γιατί αργεί το feed.',
          '«Το αρχείο είναι πολύ μεγάλο.» Διαβάζουμε αρχεία έως περίπου 80 MB.',
          '«Δεν βρήκαμε προϊόντα με τιμή, link και απόθεμα.» Συνήθως λείπει ένα υποχρεωτικό πεδίο από όλα τα προϊόντα ή έχει όνομα που δεν αναγνωρίζουμε (δες την ενότητα 2), ή όλα είναι δηλωμένα εξαντλημένα.',
          '«Δεν μοιάζει με κατάστημα Shopify…» ή «…WooCommerce…»: δες τις ενότητες 3 και 4.',
        ],
      },

      { type: 'h2', text: '7. Το ίδιο προϊόν σε διαφορετικά καταστήματα' },
      { type: 'p', text: 'Στη σελίδα ενός προϊόντος δείχνουμε όλα τα καταστήματα που έχουν το ίδιο προϊόν, πρώτα το χαμηλότερο σύνολο (τιμή μαζί με μεταφορικά). Η φθηνότερη προσφορά έχει την ένδειξη «Καλύτερη τιμή». Για να ξέρουμε ότι δύο προσφορές είναι το ίδιο προϊόν, κοιτάμε:' },
      {
        type: 'ul',
        items: [
          'το **barcode (EAN/GTIN)**: ίδιο barcode σημαίνει ίδιο προϊόν·',
          'αν δεν υπάρχει barcode, τη **μάρκα μαζί με τον κωδικό κατασκευαστή (MPN)**.',
        ],
      },
      { type: 'p', text: 'Τους κωδικούς του καταστήματος (SKU) δεν τους χρησιμοποιούμε ποτέ για αντιστοίχιση, γιατί κάθε κατάστημα έχει τους δικούς του. Το barcode χρειάζεται τουλάχιστον 8 ψηφία (τα μηδενικά στην αρχή δεν παίζουν ρόλο). Το MPN μετράει μόνο μαζί με μάρκα και χρειάζεται τουλάχιστον 3 χαρακτήρες. Γράψε μάρκα και MPN όπως τα γράφει ο κατασκευαστής· κεφαλαία ή μικρά δεν έχουν σημασία.' },

      { type: 'h2', text: '8. Κόστος αποστολής' },
      { type: 'p', text: 'Η σύγκριση τιμών βάζει τις προσφορές σε σειρά με βάση την τιμή μαζί με τα μεταφορικά, οπότε το σωστό κόστος αποστολής μετράει. Το παίρνουμε:' },
      {
        type: 'ul',
        items: [
          '**από το feed σου**, όταν το προϊόν έχει πεδίο shipping (ή shipping_cost, delivery_cost)· αλλιώς',
          '**από όσα δήλωσες στην αίτηση**: «Κόστος αποστολής (€)» και «Δωρεάν αποστολή από (€)». Για προϊόντα με τιμή ίση ή μεγαλύτερη από αυτό το ποσό δείχνουμε δωρεάν αποστολή.',
        ],
      },
      { type: 'p', text: 'Στο Shopify και στο WooCommerce ισχύουν πάντα οι ρυθμίσεις της αίτησης. Αν δεν έχουμε τίποτα από τα δύο, δεν δείχνουμε μεταφορικά και το σύνολο είναι μόνο η τιμή. Τις ρυθμίσεις τις αλλάζεις όποτε θέλεις στον πίνακα καταστήματος, στο «Σύνδεση και αποστολή» → «Αλλαγή». Ισχύουν από τον επόμενο συγχρονισμό.' },

      { type: 'h2', text: '9. Πώς γίνεται ο συγχρονισμός' },
      {
        type: 'ul',
        items: [
          'Μόλις εγκρίνουμε το κατάστημά σου, κάνουμε αμέσως τον πρώτο συγχρονισμό και σου στέλνουμε email.',
          'Μετά διαβάζουμε την πηγή σου αυτόματα περίπου κάθε 6 ώρες.',
          'Άλλαξες κάτι και δεν θέλεις να περιμένεις; Πάτα «Συγχρονισμός τώρα» στον πίνακα καταστήματος. Μπορείς να το κάνεις μία φορά κάθε 5 λεπτά.',
          'Σε κάθε συγχρονισμό διαβάζουμε όλη την πηγή σου. Όσα προϊόντα δεν υπάρχουν πια σε αυτήν αφαιρούνται από το Tagora.',
          'Τα εξαντλημένα μένουν εκτός και επιστρέφουν με τον επόμενο συγχρονισμό, μόλις ξαναμπούν σε απόθεμα. Για να δηλώσεις ένα προϊόν εξαντλημένο, γράψε out of stock ή «εξαντλημένο» στο availability, βάλε 0 στο quantity ή βγάλ’ το από το feed.',
          'Αν δεν μπορούμε να διαβάσουμε την πηγή σου (π.χ. το site σου είναι εκτός λειτουργίας ή το feed χάλασε) ή κανένα προϊόν δεν περνά τον έλεγχο, τα προϊόντα που είναι ήδη online μένουν online. Ξαναδοκιμάζουμε σε μία ώρα και σου στέλνουμε ένα email, όχι ένα σε κάθε προσπάθεια.',
          'Στο «Ιστορικό συγχρονισμών» βλέπεις κάθε συγχρονισμό: πόσα προϊόντα διαβάστηκαν, πόσα είναι online, πόσα έμειναν εκτός και πόσα αφαιρέθηκαν.',
        ],
      },

      { type: 'h2', text: '10. Τιμές και εκπτώσεις' },
      { type: 'p', text: 'Δείξε την πραγματική τελική τιμή με ΦΠΑ, την ίδια που βλέπει ο αγοραστής στο κατάστημά σου.' },
      { type: 'p', text: 'Αν δείχνεις έκπτωση, η παλιά τιμή πρέπει να είναι **η χαμηλότερη τιμή που είχες τις τελευταίες 30 ημέρες** πριν από τη μείωση. Αυτό ορίζει ο κανόνας Omnibus της ΕΕ και το δέχεσαι στους [όρους για καταστήματα](/pages/shop-terms). Στο feed η παλιά τιμή μπαίνει στο price και η τιμή μετά την έκπτωση στο sale_price· το ποσοστό το υπολογίζουμε εμείς. Αν δεν έχεις πραγματική έκπτωση, άφησε το sale_price κενό.' },

      { type: 'h2', text: '11. Πόσο κοστίζει' },
      { type: 'p', text: 'Το Tagora είναι **δωρεάν για τους πρώτους 12 μήνες** από την έγκριση του καταστήματός σου. Μετά κοστίζει **300 € τον χρόνο + ΦΠΑ** για κάθε κατάστημα (25 € τον μήνα), με ετήσιο τιμολόγιο.' },
      { type: 'p', text: 'Σου στέλνουμε email τουλάχιστον 30 ημέρες πριν τελειώσει η δωρεάν περίοδος. Μπορείς να αποχωρήσεις όποτε θέλεις, γράφοντάς μας στο [CONTACT EMAIL]· αν φύγεις πριν τελειώσει η δωρεάν περίοδος, δεν πληρώνεις τίποτα. Αναλυτικά στους [όρους για καταστήματα](/pages/shop-terms).' },

      { type: 'h2', text: '12. Σύνδεση στον πίνακα καταστήματος' },
      { type: 'p', text: 'Δεν υπάρχουν κωδικοί. Στη [σύνδεση καταστήματος](/merchant/login) γράφεις το email του καταστήματός σου και σου στέλνουμε σύνδεσμο μίας χρήσης, που ισχύει 30 λεπτά. Χρησιμοποίησε το email της αίτησής σου και μην προωθείς τον σύνδεσμο σε άλλους.' },

      { type: 'h2', text: '13. Χρειάζεσαι βοήθεια;' },
      { type: 'p', text: 'Γράψε μας στο [CONTACT EMAIL] ή από τη σελίδα [επικοινωνίας](/pages/contact). Στείλε μας και το link του feed ή του καταστήματός σου, για να το δούμε.' },
    ],
  },
  en: {
    title: 'Help for shops: connecting your products',
    updated: 'Last updated: 3 November 2026',
    intro: 'How to connect your products to Tagora, what each product needs, and what happens after we approve your shop. If you get stuck, [write to us](/pages/contact).',
    blocks: [
      { type: 'h2', text: '1. Four ways to connect' },
      { type: 'p', text: 'On the [page for shops](/shops) you choose how your shop connects:' },
      {
        type: 'table',
        head: ['Way', 'What you give us', 'When to choose it'],
        rows: [
          ['**XML feed**', 'The link to your feed (XML, CSV or TSV)', 'You already have a feed for Skroutz, BestPrice or Google, or your e-shop platform can make one. **This is the one we recommend.**'],
          ['**Shopify**', 'Your store address', 'You have no feed and want to start quickly.'],
          ['**WooCommerce**', 'Your shop address', 'You have no feed and want to start quickly.'],
          ['**WooCommerce plugin**', 'Nothing: you install the plugin and enter the connection key', 'You use WooCommerce. **This is the one we recommend for WooCommerce**: it sends barcodes, MPN and brands, updates instantly and works behind firewalls (see section 4).'],
        ],
      },
      { type: 'p', text: '**We recommend the XML feed** because it usually carries barcodes (EAN) and manufacturer part numbers (MPN). These put your products into price comparisons, next to the same product from other shops. A feed can also carry a delivery cost for each product. The Shopify and WooCommerce product lists have no delivery costs and usually no barcodes, so your products appear in search but, as a rule, not in price comparisons.' },
      { type: 'p', text: 'You can start with Shopify or WooCommerce and switch to a feed later, in your shop dashboard under “Connection and delivery”.' },

      { type: 'h2', text: '2. Where to find your feed link' },
      {
        type: 'ul',
        items: [
          '**Already on Skroutz or BestPrice?** Use the same link you gave them. It works as it is. It is usually created by your e-shop platform or a plugin; if you do not know the link, ask your developer or your platform’s support for the feed URL.',
          '**Using Google Merchant Center?** If Merchant Center fetches your products from a link, that same link (your Google Shopping feed) works here too.',
          '**No feed yet?** A CSV or TSV file with Google-style columns is enough (see below). It must be online at a fixed address, and you need to keep it up to date, because we read it again at every sync.',
        ],
      },
      { type: 'p', text: 'The link must open without a password and lead to the file itself, not to a web page. Open it in your browser: you should see XML, or text in columns.' },
      { type: 'h3', text: 'Field names we recognise' },
      { type: 'p', text: 'We find each field by its name, so most feeds work without changes. Upper or lower case does not matter, and neither does the g: prefix of Google feeds. The Google Shopping names we read are: id, title, description, link, image_link, additional_image_link, price, sale_price, availability, brand, gtin, mpn, item_group_id, color, size, product_type or google_product_category, and shipping.' },
      { type: 'p', text: 'We also recognise the usual alternatives, such as name for the title, url for the link, image for the picture, price_with_vat for the price, manufacturer for the brand, ean or barcode for the barcode, and quantity for stock. That is why Skroutz and BestPrice feeds work as they are.' },
      { type: 'p', text: 'In a CSV or TSV file the first row must hold the column names. Columns can be separated by commas, semicolons, the | sign or tabs.' },

      { type: 'h2', text: '3. Shopify' },
      { type: 'p', text: 'Enter just your store address, for example https://yourshop.com. We read your Shopify store’s public product list. There is no app to install and nothing to share with us.' },
      {
        type: 'ul',
        items: [
          'Each variant (for example a colour or a size) becomes its own offer, with a link straight to it.',
          'The brand is the product’s Vendor and the category is its Product type. We take colour and size from options named Color, Colour or Size (or Χρώμα and Μέγεθος).',
          'If the Compare-at price is higher than the price, we show it as the old price.',
          'The list has no delivery costs and usually no barcodes. Fill in your delivery cost when you apply. For price comparisons, you need an XML feed.',
          'If your store is password-protected (for example before launch) or its product list is closed, we cannot read it. Use an XML feed instead.',
          'We read up to 25,000 products.',
        ],
      },

      { type: 'h2', text: '4. WooCommerce' },
      { type: 'p', text: '**With the Tagora plugin (recommended).** Your shop sends its products to Tagora itself: each variation (colour, size) as its own offer, with barcode (EAN), MPN, brand, sale price and stock. When you change a product, Tagora has the change within a minute, and the whole catalogue is sent every 6 hours. It works behind firewalls and Cloudflare, because we do not need to read your site.' },
      {
        type: 'ul',
        items: [
          '[Apply](/shops) and choose “WooCommerce plugin”. At the end you will see your connection key (you can create a new one any time from your shop dashboard).',
          '[Download the plugin](/downloads/tagora-woocommerce.zip) and upload it to WordPress: Plugins → Add New → Upload Plugin. Activate it.',
          'In WooCommerce → Tagora, paste the key and press Connect. Your products are sent right away and appear once your application is approved.',
          'We find barcodes in WooCommerce’s GTIN/EAN field and in the fields of the best-known EAN plugins, and brands in WooCommerce Brands and the well-known brand plugins. If yours are kept elsewhere, enter them in WooCommerce → Tagora → Advanced.',
          'Only product data is sent, never customers or orders.',
        ],
      },
      { type: 'p', text: '**Without the plugin.** Enter just your shop address. We read the Store API, a public product list built into WooCommerce. There is no plugin to install and no API keys to share.' },
      {
        type: 'ul',
        items: [
          'Each product becomes one offer. For variable products we show the lowest price.',
          'We take the brand from WooCommerce brands, or from an attribute named Brand, Manufacturer, Μάρκα or Κατασκευαστής. Colour and size come from attributes named Color, Colour, Size, Χρώμα or Μέγεθος, when the product has a single value.',
          'If the regular price is higher than the sale price, we show it as the old price.',
          'The Store API has no barcodes, MPNs or delivery costs, so your products appear in search but not in price comparisons. Fill in your delivery cost when you apply. For price comparisons, you need an XML feed.',
          'If a security plugin or a firewall blocks the Store API, the check says your site does not look like a WooCommerce shop. Ask whoever runs it to allow requests to /wp-json/wc/store/ from TagoraBot, the name our requests carry.',
          'We read up to 30,000 products.',
        ],
      },

      { type: 'h2', text: '5. What each product needs' },
      { type: 'p', text: 'A product missing a required field is left out until you fix it. Recommended fields are not required, but without them a product shows less or stays out of price comparisons.' },
      {
        type: 'table',
        head: ['Field (name in the feed)', 'Required?', 'Why'],
        rows: [
          ['**Product id** (id)', 'Yes', 'Tells your products apart. Each product and each variant needs its own id, and it is best if it never changes.'],
          ['**Title** (title)', 'Yes', 'How shoppers find the product. It counts more than any other field in search.'],
          ['**Price** (price)', 'Yes', 'The final price including VAT, above 0.'],
          ['**Link** (link)', 'Yes', 'The product’s page on your website, a full address starting with https:// or http://. Shoppers go there to buy.'],
          ['**Stock** (availability)', 'Recommended', 'Sold-out products are left out. Without this field we treat the product as in stock.'],
          ['**Image** (image_link)', 'Recommended', 'Shoppers want to see what they are buying. Without an image the product still appears, with a warning. More photos go in additional_image_link.'],
          ['**Brand** (brand)', 'Recommended', 'Needed for matching by MPN and for the brand filter. Without it we show your shop’s name as the brand.'],
          ['**Barcode** (gtin)', 'Recommended', 'Puts the product into price comparisons: same barcode, same product.'],
          ['**Manufacturer part number** (mpn)', 'Recommended if there is no barcode', 'Together with the brand, puts the product into price comparisons.'],
          ['**Category** (product_type or google_product_category)', 'Recommended', 'For the category filter. Write it in words, for example Home > Kitchen > Pans; we use the last part. Google’s numeric category ids are not used.'],
          ['**Description** (description)', 'Recommended', 'Shown on the product page. It also counts a little in search.'],
          ['**Colour, size** (color, size)', 'Optional', 'For the colour and size filters. Colour also counts in search.'],
          ['**Variant group** (item_group_id)', 'Optional', 'Joins the colours or sizes of one product. The first variant in your feed counts as the main one.'],
          ['**Sale price** (sale_price)', 'Optional', 'When it is lower than price, we show it as the price and price as the old price.'],
          ['**Delivery cost** (shipping)', 'Optional', 'Price comparisons use the price plus delivery. Without it we use the cost you gave when you applied.'],
        ],
      },

      { type: 'h2', text: '6. The “Check” button' },
      { type: 'p', text: 'When you apply, enter your feed or shop address and press “Check”. We read your products there and then and show you how many are ready for Tagora, how many we read and in which format, a few sample products, and what needs attention. You can send your application once at least one product passes.' },
      { type: 'p', text: 'After every sync you see the same messages in your shop dashboard, under “Needs attention”. What they mean:' },
      {
        type: 'table',
        head: ['Message', 'What happens', 'What to do'],
        rows: [
          ['“without a product id”', '**Left out**', 'Give every product an id.'],
          ['“without a title”', '**Left out**', 'Add a title.'],
          ['“without a price”', '**Left out**', 'Add a price above 0.'],
          ['“without a valid link”', '**Left out**', 'Use the full address of the product page, starting with https://.'],
          ['“with a duplicate id”', '**Left out**, apart from the first', 'Give each product and each variant its own id.'],
          ['“sold out (hidden)”', 'Hidden while sold out', 'Nothing. They come back with the next sync once they are in stock.'],
          ['“without an image”', 'Shown without an image', 'Add image_link with a full address.'],
          ['“without a brand (the shop name is used)”', 'Shown with your shop name as the brand', 'Add brand.'],
          ['“without a barcode (EAN) or MPN: left out of price comparison”', 'Shown in search, not in price comparisons', 'Add gtin, or brand together with mpn.'],
          ['“very large catalogue: read up to the limit”', 'Products past the limit are left out', 'Connect your shop with an XML feed.'],
        ],
      },
      { type: 'p', text: 'Messages in red are about products that stay off Tagora until you fix them in your feed or shop. The others are warnings or information.' },
      { type: 'h3', text: 'If the check fails' },
      {
        type: 'ul',
        items: [
          '“This address is a web page, not an XML feed.” You entered a page of your shop. Enter the link to the feed file itself.',
          '“The address answered with an error.” Open the link in your browser and check that it opens without signing in.',
          '“The address took too long to answer.” Try again in a little while. If it keeps happening, ask your developer to look at why the feed is slow.',
          '“The file is too large.” We read files up to about 80 MB.',
          '“We found no products with a price, a link and stock.” Usually a required field is missing from every product or has a name we do not recognise (see section 2), or every product is marked sold out.',
          '“This does not look like a Shopify store…” or “…WooCommerce shop…”: see sections 3 and 4.',
        ],
      },

      { type: 'h2', text: '7. Same product, different shops' },
      { type: 'p', text: 'A product page shows every shop that has the same product, lowest total first (price plus delivery). The cheapest offer is marked “Best price”. To know that two offers are the same product, we look at:' },
      {
        type: 'ul',
        items: [
          'the **barcode (EAN/GTIN)**: the same barcode means the same product;',
          'if there is no barcode, the **brand together with the manufacturer part number (MPN)**.',
        ],
      },
      { type: 'p', text: 'Shop codes (SKUs) are never used for matching, because every shop has its own. A barcode needs at least 8 digits (leading zeros do not matter). An MPN only counts together with a brand, and needs at least 3 characters. Write the brand and MPN the way the manufacturer does; upper or lower case does not matter.' },

      { type: 'h2', text: '8. Delivery cost' },
      { type: 'p', text: 'Price comparisons order offers by price plus delivery, so a correct delivery cost matters. We take it:' },
      {
        type: 'ul',
        items: [
          '**from your feed**, when the product has a shipping field (or shipping_cost, delivery_cost); otherwise',
          '**from what you gave when you applied**: “Delivery cost (€)” and “Free delivery from (€)”. Products priced at or above that amount show free delivery.',
        ],
      },
      { type: 'p', text: 'For Shopify and WooCommerce, the settings from your application always apply. If we have neither, we show no delivery cost and the total is the price alone. You can change these settings at any time in your shop dashboard, under “Connection and delivery” → “Change”. The next sync uses the new settings.' },

      { type: 'h2', text: '9. How syncing works' },
      {
        type: 'ul',
        items: [
          'When we approve your shop, we run the first sync straight away and email you.',
          'After that we read your source automatically about every 6 hours.',
          'Changed something and do not want to wait? Press “Sync now” in your shop dashboard. You can do this once every 5 minutes.',
          'Each sync reads your whole source. Products that are no longer in it are removed from Tagora.',
          'Sold-out products are left out, and come back with the next sync once they are in stock again. To mark a product as sold out, put out of stock in availability, set quantity to 0, or take it out of the feed.',
          'If we cannot read your source (for example your site is down or the feed is broken), or no product passes the checks, the products already online stay online. We try again in an hour and email you once, not on every try.',
          'Under “Sync history” you see every sync: how many products we read, how many are live, how many were left out and how many were removed.',
        ],
      },

      { type: 'h2', text: '10. Prices and discounts' },
      { type: 'p', text: 'Show the real final price including VAT, the same price shoppers see on your website.' },
      { type: 'p', text: 'If you show a discount, the old price must be **the lowest price you charged in the last 30 days** before the reduction. This is the EU Omnibus rule, and you agree to it in the [terms for shops](/pages/shop-terms). In a feed, the old price goes in price and the discounted price in sale_price; we work out the percentage ourselves. If there is no real discount, leave sale_price empty.' },

      { type: 'h2', text: '11. What it costs' },
      { type: 'p', text: 'Tagora is **free for the first 12 months** after we approve your shop. After that it costs **€300 a year + VAT** per shop (€25 a month), invoiced yearly.' },
      { type: 'p', text: 'We email you at least 30 days before your free period ends. You can leave at any time by writing to us at [CONTACT EMAIL]; if you leave before the free period ends, you pay nothing. The details are in the [terms for shops](/pages/shop-terms).' },

      { type: 'h2', text: '12. Signing in' },
      { type: 'p', text: 'There are no passwords. On the [shop sign-in](/merchant/login) page, enter your shop’s email and we send you a one-time link that works for 30 minutes. Use the email you applied with, and do not forward the link to anyone.' },

      { type: 'h2', text: '13. Need help?' },
      { type: 'p', text: 'Write to us at [CONTACT EMAIL] or through the [contact page](/pages/contact). Include the link to your feed or shop, so we can take a look.' },
    ],
  },
};
