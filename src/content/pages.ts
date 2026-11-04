// "How we rank results" and "Contact": public pages a comparison site needs
// (EU consumer law asks comparison sites to explain ranking; Google's CSS review
// looks for clear company and customer-service details).
// Text supports **bold**, [links](/path) and [PLACEHOLDERS] (see src/pages/Legal.tsx).
import type { LegalPage } from './legal';

export const rankingPage: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Πώς κατατάσσουμε τα αποτελέσματα',
    updated: 'Τελευταία ενημέρωση: 4 Νοεμβρίου 2026',
    intro: 'Θέλουμε να ξέρεις γιατί βλέπεις τα προϊόντα με αυτή τη σειρά. Εδώ εξηγούμε απλά τι μετράει, τι δεν μετράει, και από πού έρχονται οι τιμές.',
    blocks: [
      { type: 'h2', text: '1. Ποια καταστήματα εμφανίζονται' },
      { type: 'p', text: 'Βλέπεις προϊόντα από τα καταστήματα που συνεργάζονται με το Tagora: έκαναν αίτηση, την εγκρίναμε, και μας δίνουν αυτόματα τον κατάλογό τους. Δεν περιλαμβάνουμε κάθε κατάστημα της αγοράς, οπότε μπορεί να υπάρχουν προσφορές που δεν εμφανίζονται εδώ.' },
      { type: 'p', text: 'Δείχνουμε μόνο προϊόντα που έχουν τιμή, σωστό σύνδεσμο προς το κατάστημα και απόθεμα. Τα εξαντλημένα δεν εμφανίζονται.' },

      { type: 'h2', text: '2. Η σειρά των αποτελεσμάτων' },
      { type: 'p', text: 'Από προεπιλογή («Πιο σχετικά») η σειρά βασίζεται στο πόσο ταιριάζει κάθε προϊόν με αυτό που έψαξες. Κοιτάμε, με αυτή τη σειρά σημασίας:' },
      { type: 'ul', items: ['το **όνομα του προϊόντος**', 'τη **μάρκα**', 'το **χρώμα**', 'την **κατηγορία**', 'την **περιγραφή**'] },
      { type: 'p', text: 'Συγχωρούμε μικρά ορθογραφικά λάθη. Όταν δύο προϊόντα ταιριάζουν το ίδιο, προηγείται η βασική έκδοση του προϊόντος (π.χ. το πρώτο χρώμα ή μέγεθος που δίνει το κατάστημα).' },
      { type: 'p', text: 'Μπορείς να αλλάξεις τη σειρά από την «Ταξινόμηση»: **χαμηλότερη τιμή**, **υψηλότερη τιμή** ή **μεγαλύτερη έκπτωση**. Τα φίλτρα (κατηγορία, κατάστημα, μάρκα, μέγεθος, χρώμα, έκπτωση) κρατούν μόνο τα προϊόντα που διαλέγεις, χωρίς να αλλάζουν τη σειρά.' },

      { type: 'h2', text: '3. Η σύγκριση τιμών στη σελίδα του προϊόντος' },
      { type: 'p', text: 'Στη σελίδα ενός προϊόντος βλέπεις το ίδιο προϊόν σε όλα τα συνεργαζόμενα καταστήματα που το έχουν. Το αναγνωρίζουμε από τον γραμμωτό κώδικα (EAN) ή από τη μάρκα μαζί με τον κωδικό του κατασκευαστή (MPN). Ταξινομούμε τις προσφορές με βάση το **σύνολο: τιμή συν μεταφορικά**, και η φθηνότερη έχει την ένδειξη «Καλύτερη τιμή».' },
      { type: 'p', text: 'Αν ένα κατάστημα δεν δίνει κόστος αποστολής στον κατάλογό του, χρησιμοποιούμε τις ρυθμίσεις αποστολής του καταστήματος, όταν υπάρχουν. Αν το κόστος παραμένει άγνωστο, εμφανίζουμε «Δεν έχει δοθεί κόστος αποστολής» και δεν εμφανίζουμε σύνολο με μεταφορικά. Η τιμή του προϊόντος και ο σύνδεσμος προς το κατάστημα παραμένουν διαθέσιμα.' },

      { type: 'h2', text: '4. Πληρωμές και χορηγούμενα' },
      { type: 'p', text: '**Κανένα κατάστημα δεν μπορεί να πληρώσει για να εμφανιστεί πιο ψηλά** στα αποτελέσματα ή στη σύγκριση τιμών. Σήμερα δεν υπάρχουν πληρωμένες θέσεις. Αν προσθέσουμε στο μέλλον, θα ξεχωρίζουν καθαρά με την ένδειξη «Χορηγούμενο».' },
      { type: 'p', text: 'Το Tagora είναι υπηρεσία σύγκρισης αγορών (CSS) για το Google Shopping. Τα καταστήματα μπορεί να μας πληρώνουν για τη διαφήμιση των προϊόντων τους στο Google ή για άλλες υπηρεσίες. Αυτό δεν επηρεάζει τη σειρά των αποτελεσμάτων στον ιστότοπό μας.' },

      { type: 'h2', text: '5. Από πού έρχονται οι τιμές' },
      { type: 'p', text: 'Τιμές, εκπτώσεις, μεταφορικά και διαθεσιμότητα έρχονται από τα ίδια τα καταστήματα. Τα ενημερώνουμε αυτόματα κάθε λίγες ώρες, οπότε μπορεί για λίγο να διαφέρουν από το κατάστημα. Πριν αγοράσεις ισχύει πάντα ό,τι δείχνει το κατάστημα.' },
      { type: 'p', text: 'Η «παλιά τιμή» και το ποσοστό έκπτωσης είναι όπως μας τα δίνει το κατάστημα. Τα καταστήματα δεσμεύονται ότι η παλιά τιμή είναι η χαμηλότερη των τελευταίων 30 ημερών, όπως ορίζει ο νόμος ([όροι για καταστήματα](/pages/shop-terms)).' },

      { type: 'h2', text: '6. Κριτικές' },
      { type: 'p', text: 'Δεν εμφανίζουμε κριτικές ή βαθμολογίες για καταστήματα ή προϊόντα.' },

      { type: 'h2', text: '7. Κάτι δεν σου φαίνεται σωστό;' },
      { type: 'p', text: 'Αν δεις λάθος τιμή, λάθος προϊόν ή κάτι που σε μπερδεύει, [γράψε μας](/pages/contact). Το ελέγχουμε και ενημερώνουμε το κατάστημα.' },
    ],
  },
  en: {
    title: 'How we rank results',
    updated: 'Last updated: 4 November 2026',
    intro: 'We want you to know why products appear in the order you see. This page explains, plainly, what counts, what does not, and where the prices come from.',
    blocks: [
      { type: 'h2', text: '1. Which shops appear' },
      { type: 'p', text: 'You see products from Tagora’s partner shops: shops that applied, were approved, and send us their catalogue automatically. We do not include every shop on the market, so there may be offers that do not appear here.' },
      { type: 'p', text: 'We only show products that have a price, a working link to the shop and stock. Sold-out products are hidden.' },

      { type: 'h2', text: '2. The order of results' },
      { type: 'p', text: 'By default (“Most relevant”) the order depends on how well each product matches what you searched for. We look at, in order of importance:' },
      { type: 'ul', items: ['the **product name**', 'the **brand**', 'the **colour**', 'the **category**', 'the **description**'] },
      { type: 'p', text: 'Small typos are forgiven. When two products match equally, the main version of a product comes first (for example the first colour or size the shop lists).' },
      { type: 'p', text: 'You can change the order with “Sort by”: **lowest price**, **highest price** or **biggest discount**. Filters (category, shop, brand, size, colour, discount) keep only the products you choose; they do not change the order.' },

      { type: 'h2', text: '3. Price comparison on a product page' },
      { type: 'p', text: 'A product page shows the same product in every partner shop that has it. We recognise it by its barcode (EAN) or by brand together with the manufacturer’s part number (MPN). Offers are sorted by **total: price plus delivery**, and the cheapest is labelled “Best price”.' },
      { type: 'p', text: 'If a shop’s catalogue has no delivery cost, we use delivery settings for that shop when available. If the cost remains unknown, we show “Delivery cost not provided” and no delivered total. The product price and shop link remain available.' },

      { type: 'h2', text: '4. Payments and sponsored results' },
      { type: 'p', text: '**No shop can pay to appear higher** in the results or in the price comparison. There are no paid placements today. If we ever add them, they will be clearly labelled “Sponsored”.' },
      { type: 'p', text: 'Tagora is a comparison shopping service (CSS) for Google Shopping. Shops may pay us to advertise their products on Google or for other services. This does not affect the order of results on our website.' },

      { type: 'h2', text: '5. Where prices come from' },
      { type: 'p', text: 'Prices, discounts, delivery costs and stock come from the shops themselves. We update them automatically every few hours, so for a short time they may differ from the shop. Before you buy, what the shop shows always applies.' },
      { type: 'p', text: 'The “old price” and the discount percentage are as the shop gives them. Shops commit that the old price is their lowest price of the last 30 days, as the law requires ([terms for shops](/pages/shop-terms)).' },

      { type: 'h2', text: '6. Reviews' },
      { type: 'p', text: 'We do not show reviews or ratings of shops or products.' },

      { type: 'h2', text: '7. Something looks wrong?' },
      { type: 'p', text: 'If you see a wrong price, a wrong product or anything confusing, [write to us](/pages/contact). We check it and let the shop know.' },
    ],
  },
};

export const contactPage: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Επικοινωνία',
    updated: '',
    intro: 'Είμαστε εδώ για ερωτήσεις σχετικά με το Tagora, για ένα προϊόν που είδες στον ιστότοπο ή για τη συνεργασία με το κατάστημά σου.',
    blocks: [
      { type: 'h2', text: 'Εξυπηρέτηση' },
      { type: 'ul', items: ['**Email:** [CONTACT EMAIL]', '**Τηλέφωνο:** [CUSTOMER SERVICE PHONE]'] },
      { type: 'p', text: 'Για παραγγελίες, πληρωμές, αποστολές και επιστροφές επικοινώνησε απευθείας με το κατάστημα από το οποίο αγόρασες. Το Tagora δεν πουλά προϊόντα και δεν βλέπει τις παραγγελίες σου.' },

      { type: 'h2', text: 'Λάθος τιμή ή προϊόν;' },
      { type: 'p', text: 'Αν μια τιμή, μια φωτογραφία ή η διαθεσιμότητα δεν ταιριάζει με το κατάστημα, στείλε μας τον σύνδεσμο της σελίδας στο [CONTACT EMAIL]. Το ελέγχουμε και ενημερώνουμε το κατάστημα. Δες και [πώς κατατάσσουμε τα αποτελέσματα](/pages/ranking).' },

      { type: 'h2', text: 'Για καταστήματα' },
      { type: 'p', text: 'Θέλεις να εμφανίζονται τα προϊόντα σου στο Tagora; [Κάνε αίτηση](/shops). Αν έχεις ήδη λογαριασμό, [συνδέσου](/merchant/login). Οι [όροι για καταστήματα](/pages/shop-terms) περιγράφουν τη συνεργασία.' },

      { type: 'h2', text: 'Προσωπικά δεδομένα' },
      { type: 'p', text: 'Για αιτήματα σχετικά με τα δεδομένα σου, δες την [πολιτική απορρήτου](/pages/privacy-policy) ή γράψε μας στο [CONTACT EMAIL].' },

      { type: 'h2', text: 'Στοιχεία εταιρείας' },
      { type: 'ul', items: ['**Επωνυμία:** [COMPANY LEGAL NAME]', '**Διεύθυνση:** [ADDRESS]', '**ΓΕΜΗ:** [GEMI NUMBER]', '**ΑΦΜ:** [VAT NUMBER]'] },
      { type: 'p', text: 'Διάβασε επίσης τους [όρους χρήσης](/pages/terms).' },
    ],
  },
  en: {
    title: 'Contact',
    updated: '',
    intro: 'We are here for questions about Tagora, about a product you saw on the site, or about listing your shop.',
    blocks: [
      { type: 'h2', text: 'Customer service' },
      { type: 'ul', items: ['**Email:** [CONTACT EMAIL]', '**Phone:** [CUSTOMER SERVICE PHONE]'] },
      { type: 'p', text: 'For orders, payments, delivery and returns, contact the shop you bought from directly. Tagora does not sell products and cannot see your orders.' },

      { type: 'h2', text: 'Wrong price or product?' },
      { type: 'p', text: 'If a price, a photo or the stock does not match the shop, send us the page link at [CONTACT EMAIL]. We check it and let the shop know. See also [how we rank results](/pages/ranking).' },

      { type: 'h2', text: 'For shops' },
      { type: 'p', text: 'Want your products on Tagora? [Apply here](/shops). Already a partner? [Sign in](/merchant/login). The [terms for shops](/pages/shop-terms) describe how we work together.' },

      { type: 'h2', text: 'Personal data' },
      { type: 'p', text: 'For requests about your data, see the [privacy policy](/pages/privacy-policy) or write to us at [CONTACT EMAIL].' },

      { type: 'h2', text: 'Company details' },
      { type: 'ul', items: ['**Company:** [COMPANY LEGAL NAME]', '**Address:** [ADDRESS]', '**Company register (GEMI):** [GEMI NUMBER]', '**VAT:** [VAT NUMBER]'] },
      { type: 'p', text: 'Please also read our [terms of use](/pages/terms).' },
    ],
  },
};
