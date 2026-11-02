// Terms of use (visitors) and terms for partner shops (P2B Regulation (EU) 2019/1150), Greek / English.
// Text supports **bold**, [links](/path) and [PLACEHOLDERS] (see src/pages/Legal.tsx).
// Bracketed ALL-CAPS placeholders must be filled in by the operator before launch.
import type { LegalPage } from './legal';

/* -------------------------------------------------------------------------- */
/*                                TERMS OF USE                                */
/* -------------------------------------------------------------------------- */

export const termsOfUse: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Όροι Χρήσης',
    updated: 'Τελευταία ενημέρωση: [LAST UPDATED DATE]',
    intro:
      'Οι όροι αυτοί ισχύουν για όσους επισκέπτονται και χρησιμοποιούν το Tagora. Χρησιμοποιώντας τον ιστότοπο τους αποδέχεστε· αν δεν συμφωνείτε, παρακαλούμε μην τον χρησιμοποιείτε.',
    blocks: [
      { type: 'h2', text: '1. Ποιοι είμαστε' },
      {
        type: 'p',
        text: 'Το Tagora το λειτουργεί η εταιρεία **[COMPANY LEGAL NAME]**, [ADDRESS], αριθ. ΓΕΜΗ [GEMI NUMBER], ΑΦΜ [VAT NUMBER] («εμείς»). Τα στοιχεία επικοινωνίας μας θα τα βρείτε στην ενότητα 14.',
      },

      { type: 'h2', text: '2. Τι είναι το Tagora' },
      {
        type: 'p',
        text: 'Το Tagora είναι ιστότοπος σύγκρισης τιμών και υπηρεσία σύγκρισης αγορών (Comparison Shopping Service – CSS) του Google Shopping, στα ελληνικά για την Ελλάδα και την Κύπρο και στα αγγλικά για την Ιρλανδία και τη Μάλτα. Μπορείτε να αναζητάτε προϊόντα από πολλά ηλεκτρονικά καταστήματα, να εφαρμόζετε φίλτρα, να συγκρίνετε συνολικές τιμές (τιμή μαζί με έξοδα αποστολής) και με ένα κλικ να μεταβαίνετε στο κατάστημα για να αγοράσετε. Δεν χρειάζεστε λογαριασμό και δεν μας πληρώνετε τίποτα.',
      },

      { type: 'h2', text: '3. Δεν είμαστε ο πωλητής' },
      {
        type: 'p',
        text: 'Το Tagora **δεν πουλά προϊόντα, δεν εισπράττει πληρωμές και δεν είναι συμβαλλόμενο μέρος σε καμία αγορά**. Η σύμβαση πώλησης συνάπτεται απευθείας με το κατάστημα, το οποίο ευθύνεται για το προϊόν, την πληρωμή, την αποστολή, τις επιστροφές, την υπαναχώρηση και την εγγύηση. Για κάθε ζήτημα που αφορά μια παραγγελία, απευθυνθείτε στο κατάστημα.',
      },

      { type: 'h2', text: '4. Τιμές, απόθεμα και έξοδα αποστολής' },
      {
        type: 'p',
        text: 'Τιμές, εκπτώσεις, απόθεμα, έξοδα αποστολής, περιγραφές και φωτογραφίες τα ορίζουν τα ίδια τα καταστήματα. Τα στοιχεία ενημερώνονται αυτόματα περίπου κάθε 6 ώρες, οπότε στο μεταξύ μπορεί να έχουν αλλάξει. Τα έξοδα αποστολής είναι όσα μας έχει δηλώσει το κατάστημα και μπορεί να διαφέρουν ανάλογα με τον προορισμό ή την παραγγελία σας.',
      },
      {
        type: 'p',
        text: '**Δεσμευτικά είναι πάντα όσα αναγράφει ο ιστότοπος του καταστήματος τη στιγμή της παραγγελίας.** Ελέγξτε τα πριν ολοκληρώσετε την αγορά.',
      },

      { type: 'h2', text: '5. Τι καλύπτει η σύγκριση' },
      {
        type: 'p',
        text: 'Η σύγκριση περιλαμβάνει **μόνο τα συνεργαζόμενα καταστήματα που έχουμε εγκρίνει** και μόνο προϊόντα σε απόθεμα. Δεν καλύπτει κάθε προσφορά της αγοράς, οπότε μπορεί να υπάρχουν αλλού φθηνότερες προσφορές. Το ίδιο προϊόν σε διαφορετικά καταστήματα το αναγνωρίζουμε από τον γραμμωτό κώδικα (EAN/GTIN) ή από τη μάρκα και τον κωδικό κατασκευαστή (MPN), επομένως η αντιστοίχιση εξαρτάται από την ακρίβεια των στοιχείων των καταστημάτων.',
      },

      { type: 'h2', text: '6. Πώς κατατάσσονται τα αποτελέσματα' },
      {
        type: 'p',
        text: 'Από προεπιλογή, τα αποτελέσματα κατατάσσονται με βάση τη συνάφεια με τους όρους αναζήτησης, δηλαδή πόσο ταιριάζουν ο τίτλος, η μάρκα, το χρώμα, η κατηγορία και η περιγραφή του προϊόντος, και στη συνέχεια με τη σειρά των παραλλαγών του. Μπορείτε επίσης να ταξινομήσετε κατά χαμηλότερη ή υψηλότερη τιμή ή κατά μεγαλύτερη έκπτωση. Στη σελίδα ενός προϊόντος, οι προσφορές ταξινομούνται κατά συνολική τιμή μαζί με τα έξοδα αποστολής, και η φθηνότερη φέρει την ένδειξη «Καλύτερη τιμή».',
      },
      {
        type: 'p',
        text: '**Κανένα κατάστημα δεν μπορεί να πληρώσει για να εμφανίζεται ψηλότερα.** Σήμερα δεν υπάρχουν πληρωμένες θέσεις· αν προστεθούν στο μέλλον, θα φέρουν την ένδειξη «Χορηγούμενο». Περισσότερα στη σελίδα [Πώς κατατάσσουμε τα αποτελέσματα](/pages/ranking).',
      },

      { type: 'h2', text: '7. Σύνδεσμοι προς άλλους ιστότοπους' },
      {
        type: 'p',
        text: 'Οι σύνδεσμοι προς καταστήματα και άλλους τρίτους οδηγούν σε ιστότοπους που δεν ελέγχουμε. Δεν ευθυνόμαστε για το περιεχόμενο, την ασφάλεια ή τις πρακτικές απορρήτου τους· εκεί ισχύουν οι δικοί τους όροι και η δική τους πολιτική απορρήτου.',
      },

      { type: 'h2', text: '8. Αποδεκτή χρήση' },
      { type: 'p', text: 'Μπορείτε να χρησιμοποιείτε το Tagora για να βρίσκετε και να συγκρίνετε προϊόντα. Δεν επιτρέπεται:' },
      {
        type: 'ul',
        items: [
          'να αντλείτε ή να κατεβάζετε μαζικά περιεχόμενο (τιμές, περιγραφές, εικόνες) με ρομπότ, scrapers ή άλλα αυτοματοποιημένα μέσα· εξαιρούνται οι γενικές μηχανές αναζήτησης που ευρετηριάζουν τις δημόσιες σελίδες μας·',
          'να επιχειρείτε να διαταράξετε ή να υπερφορτώσετε τον ιστότοπο, να παρακάμψετε τα μέτρα ασφαλείας του ή να μπείτε σε μέρη του που δεν προορίζονται για εσάς·',
          'να καταχράζεστε την εγγραφή καταστημάτων, για παράδειγμα με ψευδή στοιχεία, με αίτηση για κατάστημα που δεν εκπροσωπείτε ή με μαζικές αιτήσεις·',
          'να χρησιμοποιείτε τον ιστότοπο παράνομα ή με τρόπο που βλάπτει εμάς, τα καταστήματα ή άλλους επισκέπτες.',
        ],
      },
      { type: 'p', text: 'Σε τέτοια περίπτωση μπορούμε να περιορίσουμε ή να διακόψουμε την πρόσβαση.' },

      { type: 'h2', text: '9. Πνευματική ιδιοκτησία' },
      {
        type: 'p',
        text: 'Το όνομα και το λογότυπο Tagora, καθώς και ο σχεδιασμός, τα κείμενα και ο κώδικας του ιστότοπου, ανήκουν σε εμάς ή στους δικαιοπαρόχους μας. Οι φωτογραφίες, οι περιγραφές και τα σήματα των προϊόντων ανήκουν στα καταστήματα, στους κατασκευαστές ή σε άλλους δικαιούχους. Δεν επιτρέπεται η αναπαραγωγή τους χωρίς άδεια, πέρα από όσα επιτρέπει ο νόμος.',
      },

      { type: 'h2', text: '10. Ευθύνη' },
      {
        type: 'p',
        text: 'Φροντίζουμε ο ιστότοπος να λειτουργεί σωστά, αλλά δεν εγγυόμαστε ότι θα είναι πάντα διαθέσιμος ή ότι κάθε πληροφορία θα είναι πλήρης και ακριβής, αφού τα στοιχεία των προϊόντων προέρχονται από τα καταστήματα. Στον βαθμό που επιτρέπει ο νόμος, δεν ευθυνόμαστε για ζημίες από λάθη στα στοιχεία των καταστημάτων, από αγορές σε καταστήματα ή από προσωρινή διακοπή λειτουργίας του ιστότοπου.',
      },
      {
        type: 'p',
        text: '**Τίποτα στους όρους αυτούς δεν περιορίζει τα δικαιώματά σας ως καταναλωτή** ούτε την ευθύνη μας που δεν μπορεί να αποκλειστεί κατά νόμο, όπως η ευθύνη για δόλο ή βαριά αμέλεια.',
      },

      { type: 'h2', text: '11. Αναφορά λανθασμένης καταχώρισης' },
      {
        type: 'p',
        text: 'Αν δείτε λάθος τιμή, λάθος προϊόν, σύνδεσμο που δεν λειτουργεί ή περιεχόμενο που θεωρείτε παράνομο, στείλτε μας στο [CONTACT EMAIL] τον σύνδεσμο της σελίδας και μια σύντομη περιγραφή του προβλήματος. Θα το ελέγξουμε, θα ενημερώσουμε το κατάστημα και, αν χρειαστεί, θα αποκρύψουμε την καταχώριση μέχρι να διορθωθεί.',
      },

      { type: 'h2', text: '12. Αλλαγές στους όρους' },
      {
        type: 'p',
        text: 'Μπορεί να ενημερώνουμε τους όρους αυτούς, για παράδειγμα όταν αλλάζει η υπηρεσία ή η νομοθεσία. Η νέα έκδοση δημοσιεύεται σε αυτή τη σελίδα με νέα ημερομηνία ενημέρωσης και ισχύει για τη χρήση του ιστότοπου από τη δημοσίευσή της.',
      },

      { type: 'h2', text: '13. Εφαρμοστέο δίκαιο και επίλυση διαφορών' },
      {
        type: 'p',
        text: 'Οι όροι αυτοί διέπονται από το ελληνικό δίκαιο και για τις διαφορές που προκύπτουν από αυτούς αρμόδια είναι τα δικαστήρια [COURTS CITY]. Αν είστε καταναλωτής, διατηρείτε την προστασία των αναγκαστικών διατάξεων του δικαίου της χώρας όπου κατοικείτε και το δικαίωμα να προσφύγετε στα δικαστήρια της χώρας αυτής.',
      },
      {
        type: 'p',
        text: 'Αν έχετε παράπονο για εμάς, γράψτε μας πρώτα στο [CONTACT EMAIL]. Ως καταναλωτής στην ΕΕ μπορείτε επίσης να απευθυνθείτε σε φορέα εναλλακτικής επίλυσης καταναλωτικών διαφορών ή στην αρχή προστασίας του καταναλωτή της χώρας σας· για διασυνοριακές διαφορές βοηθά δωρεάν το δίκτυο των Ευρωπαϊκών Κέντρων Καταναλωτή (ECC-Net). Για διαφορές που αφορούν μια αγορά, απευθυνθείτε στο κατάστημα.',
      },

      { type: 'h2', text: '14. Επικοινωνία' },
      { type: 'p', text: '**[COMPANY LEGAL NAME]**, [ADDRESS] · ΓΕΜΗ [GEMI NUMBER] · ΑΦΜ [VAT NUMBER]' },
      { type: 'ul', items: ['Email: [CONTACT EMAIL]', 'Τηλέφωνο εξυπηρέτησης: [CUSTOMER SERVICE PHONE]'] },
      {
        type: 'p',
        text: 'Για τα προσωπικά δεδομένα, δείτε την [Πολιτική Απορρήτου](/pages/privacy-policy). Για τα καταστήματα ισχύουν επιπλέον οι [Όροι για καταστήματα](/pages/shop-terms).',
      },
    ],
  },

  en: {
    title: 'Terms of Use',
    updated: 'Last updated: [LAST UPDATED DATE]',
    intro:
      'These terms apply to everyone who visits and uses Tagora. By using the website you accept them; if you do not agree, please do not use it.',
    blocks: [
      { type: 'h2', text: '1. Who we are' },
      {
        type: 'p',
        text: 'Tagora is operated by **[COMPANY LEGAL NAME]**, [ADDRESS], GEMI no. [GEMI NUMBER], VAT no. [VAT NUMBER] (“we”, “us”). Our contact details are in section 14.',
      },

      { type: 'h2', text: '2. What Tagora is' },
      {
        type: 'p',
        text: 'Tagora is a price-comparison website and a Comparison Shopping Service (CSS) for Google Shopping, in Greek for Greece and Cyprus and in English for Ireland and Malta. You can search for products from many online shops, apply filters, compare total prices (price plus delivery) and click through to a shop’s website to buy. You need no account, and you pay us nothing.',
      },

      { type: 'h2', text: '3. We are not the seller' },
      {
        type: 'p',
        text: 'Tagora **does not sell products, does not take payments and is not a party to any purchase**. The sales contract is made directly with the shop, which is responsible for the product, payment, delivery, returns, your right of withdrawal and the guarantee. For anything about an order, please contact the shop.',
      },

      { type: 'h2', text: '4. Prices, stock and delivery costs' },
      {
        type: 'p',
        text: 'Prices, discounts, stock, delivery costs, descriptions and photos are set by the shops themselves. Their data is updated automatically about every 6 hours, so it may have changed in the meantime. Delivery costs are those the shop gave us and may vary with your destination or order.',
      },
      {
        type: 'p',
        text: '**What the shop’s own website shows when you order is always what counts.** Please check it before you complete your purchase.',
      },

      { type: 'h2', text: '5. What the comparison covers' },
      {
        type: 'p',
        text: 'The comparison includes **only partner shops we have approved**, and only products in stock. It does not cover every offer on the market, so cheaper offers may exist elsewhere. We recognise the same product across shops by its barcode (EAN/GTIN) or by brand and manufacturer part number (MPN), so matching depends on the accuracy of the shops’ data.',
      },

      { type: 'h2', text: '6. How results are ranked' },
      {
        type: 'p',
        text: 'By default, results are ranked by relevance to your search terms, meaning how well the product’s title, brand, colour, category and description match them, and then by the order of the product’s variants. You can also sort by lowest or highest price or by biggest discount. On a product page, offers are sorted by total price including delivery, and the cheapest is labelled “Best price”.',
      },
      {
        type: 'p',
        text: '**No shop can pay to rank higher.** There are no paid placements today; if any are added in the future, they will be labelled “Sponsored”. For details, see [How we rank results](/pages/ranking).',
      },

      { type: 'h2', text: '7. Links to other websites' },
      {
        type: 'p',
        text: 'Links to shops and other third parties lead to websites we do not control. We are not responsible for their content, security or privacy practices; their own terms and privacy policies apply there.',
      },

      { type: 'h2', text: '8. Acceptable use' },
      { type: 'p', text: 'You may use Tagora to find and compare products. You must not:' },
      {
        type: 'ul',
        items: [
          'extract or download content (prices, descriptions, images) in bulk with bots, scrapers or other automated tools; general-purpose search engines indexing our public pages are excepted;',
          'try to disrupt or overload the website, get around its security measures, or access parts of it that are not meant for you;',
          'misuse the shop sign-up, for example with false details, an application for a shop you do not represent, or applications in bulk;',
          'use the website unlawfully or in a way that harms us, the shops or other visitors.',
        ],
      },
      { type: 'p', text: 'If this happens, we may restrict or block access.' },

      { type: 'h2', text: '9. Intellectual property' },
      {
        type: 'p',
        text: 'The Tagora name and logo, and the website’s design, texts and code, belong to us or our licensors. Product images, descriptions and trade marks belong to the shops, the manufacturers or their other owners. You may not reproduce any of them without permission, except as the law allows.',
      },

      { type: 'h2', text: '10. Liability' },
      {
        type: 'p',
        text: 'We take care to keep the website working properly, but we do not guarantee that it will always be available or that every piece of information will be complete and accurate, since product data comes from the shops. As far as the law allows, we are not liable for loss caused by errors in the shops’ data, by purchases from shops or by the website being temporarily unavailable.',
      },
      {
        type: 'p',
        text: '**Nothing in these terms limits your rights as a consumer**, or any liability of ours that cannot be excluded by law, such as liability for wilful misconduct or gross negligence.',
      },

      { type: 'h2', text: '11. Reporting a wrong listing' },
      {
        type: 'p',
        text: 'If you see a wrong price, a wrong product, a broken link or content you believe is unlawful, send the link to the page and a short description of the problem to [CONTACT EMAIL]. We will check it, let the shop know and, if needed, hide the listing until it is fixed.',
      },

      { type: 'h2', text: '12. Changes to these terms' },
      {
        type: 'p',
        text: 'We may update these terms, for example when the service or the law changes. The new version is published on this page with a new “last updated” date and applies to your use of the website from publication.',
      },

      { type: 'h2', text: '13. Governing law and disputes' },
      {
        type: 'p',
        text: 'These terms are governed by Greek law, and the courts of [COURTS CITY] have jurisdiction over disputes arising from them. If you are a consumer, you keep the protection of the mandatory rules of the law of the country where you live and your right to bring proceedings in that country’s courts.',
      },
      {
        type: 'p',
        text: 'If you have a complaint about us, please write to us first at [CONTACT EMAIL]. As a consumer in the EU, you can also turn to an alternative dispute resolution body or to the consumer protection authority in your country; for cross-border disputes, the European Consumer Centres Network (ECC-Net) helps free of charge. For disputes about a purchase, contact the shop.',
      },

      { type: 'h2', text: '14. Contact' },
      { type: 'p', text: '**[COMPANY LEGAL NAME]**, [ADDRESS] · GEMI [GEMI NUMBER] · VAT [VAT NUMBER]' },
      { type: 'ul', items: ['Email: [CONTACT EMAIL]', 'Customer service phone: [CUSTOMER SERVICE PHONE]'] },
      {
        type: 'p',
        text: 'For personal data, see our [Privacy Policy](/pages/privacy-policy). Shops are also bound by our [Terms for partner shops](/pages/shop-terms).',
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*                           TERMS FOR PARTNER SHOPS                          */
/* -------------------------------------------------------------------------- */

export const shopTerms: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Όροι για καταστήματα',
    updated: 'Τελευταία ενημέρωση: [LAST UPDATED DATE]',
    intro:
      'Οι όροι αυτοί ρυθμίζουν τη συνεργασία του Tagora με τα ηλεκτρονικά καταστήματα που εμφανίζουν τα προϊόντα τους σε αυτό («συνεργαζόμενα καταστήματα») και καλύπτουν, με απλά λόγια, όσα απαιτεί ο Κανονισμός (ΕΕ) 2019/1150 για τις σχέσεις επιγραμμικών πλατφορμών και επιχειρήσεων (Κανονισμός P2B). Υποβάλλοντας αίτηση, τους αποδέχεστε.',
    blocks: [
      { type: 'h2', text: '1. Ποιοι είμαστε και τι κάνουμε' },
      {
        type: 'p',
        text: 'Το Tagora το λειτουργεί η εταιρεία **[COMPANY LEGAL NAME]**, [ADDRESS], αριθ. ΓΕΜΗ [GEMI NUMBER], ΑΦΜ [VAT NUMBER] («εμείς»). Είναι ιστότοπος σύγκρισης τιμών και υπηρεσία σύγκρισης αγορών (CSS) του Google Shopping, για επισκέπτες από την Ελλάδα, την Κύπρο, την Ιρλανδία και τη Μάλτα.',
      },
      {
        type: 'p',
        text: 'Οι επισκέπτες αναζητούν και συγκρίνουν τα προϊόντα σας και με ένα κλικ μεταφέρονται στον ιστότοπό σας για να αγοράσουν. **Δεν πουλάμε, δεν εισπράττουμε πληρωμές και δεν είμαστε μέρος των συμβάσεων πώλησης.** Πωλητής είστε εσείς και έχετε όλες τις υποχρεώσεις του πωλητή απέναντι στον καταναλωτή.',
      },

      { type: 'h2', text: '2. Ποιος μπορεί να κάνει αίτηση και πώς' },
      {
        type: 'p',
        text: 'Αίτηση μπορεί να κάνει κάθε επιχείρηση που διατηρεί ηλεκτρονικό κατάστημα και πουλά σε καταναλωτές σε μία ή περισσότερες από τις χώρες όπου λειτουργούμε. Όποιος υποβάλλει την αίτηση πρέπει να έχει εξουσιοδότηση να δεσμεύει την επιχείρηση. Η αίτηση γίνεται στη [σελίδα για καταστήματα](/shops), όπου δηλώνετε τα στοιχεία της επιχείρησης και συνδέετε μία πηγή προϊόντων:',
      },
      {
        type: 'ul',
        items: [
          'αρχείο XML σε μορφή Skroutz, BestPrice ή Google Shopping, ή αρχείο CSV·',
          'τη διεύθυνση καταστήματος Shopify, από την οποία διαβάζουμε τον δημόσιο κατάλογο products.json·',
          'τη διεύθυνση καταστήματος WooCommerce, από την οποία διαβάζουμε το δημόσιο Store API.',
        ],
      },
      {
        type: 'p',
        text: 'Εξετάζουμε κάθε αίτηση και την εγκρίνουμε ή την απορρίπτουμε κατά την κρίση μας. **Αν απορρίψουμε την αίτησή σας, σας εξηγούμε τον λόγο με email.** Μπορείτε να μας απαντήσετε για να διευκρινίσετε ή να διορθώσετε κάτι και να ζητήσετε επανεξέταση.',
      },

      { type: 'h2', text: '3. Τι μας δίνετε και τι εγγυάστε' },
      { type: 'p', text: 'Είστε υπεύθυνοι για τα δεδομένα των προϊόντων σας. Εγγυάστε ότι:' },
      {
        type: 'ul',
        items: [
          'τα στοιχεία είναι **ακριβή, νόμιμα και όχι παραπλανητικά** (τίτλος, μάρκα, περιγραφή, κατηγορία και, όπου υπάρχουν, κωδικοί EAN/GTIN και MPN)·',
          'οι τιμές είναι οι **πραγματικές, τρέχουσες τελικές τιμές με ΦΠΑ**, ίδιες με αυτές που χρεώνει ο ιστότοπός σας·',
          'η διαθεσιμότητα είναι πραγματική και ενημερώνεται στην πηγή σας·',
          'τα έξοδα αποστολής που δηλώνετε, στην πηγή ή στις ρυθμίσεις του πίνακα καταστήματος, είναι σωστά·',
          'κάθε σύνδεσμος οδηγεί στη σωστή σελίδα του προϊόντος στον ιστότοπό σας·',
          'έχετε τα δικαιώματα για τις φωτογραφίες, τα κείμενα και τα σήματα που περιλαμβάνετε, ώστε να μας τα παραχωρείτε (ενότητα 4)·',
          'τηρείτε το δίκαιο προστασίας του καταναλωτή και κάθε άλλη νομοθεσία που ισχύει για τις πωλήσεις σας, και δεν διαθέτετε παράνομα ή μη ασφαλή προϊόντα.',
        ],
      },
      { type: 'h3', text: 'Παλιές τιμές και εκπτώσεις' },
      {
        type: 'p',
        text: 'Αν δείχνετε μειωμένη τιμή μαζί με προηγούμενη τιμή (για παράδειγμα με το πεδίο sale_price ή με compare price), η προηγούμενη τιμή πρέπει να είναι **η χαμηλότερη τιμή που εφαρμόσατε τις τελευταίες 30 ημέρες** πριν από τη μείωση. Αυτό ορίζει το άρθρο 6α της Οδηγίας 98/6/ΕΚ, όπως τροποποιήθηκε από την Οδηγία (ΕΕ) 2019/2161 (Omnibus), και η εθνική νομοθεσία που την ενσωματώνει. Πλασματικές ή φουσκωμένες παλιές τιμές δεν επιτρέπονται.',
      },

      { type: 'h2', text: '4. Τι κάνουμε με τα δεδομένα των προϊόντων σας' },
      {
        type: 'p',
        text: 'Διαβάζουμε την πηγή σας αυτόματα περίπου κάθε 6 ώρες· μπορείτε επίσης να ζητήσετε άμεσο συγχρονισμό με το κουμπί «Συγχρονισμός τώρα» στον πίνακα καταστήματος. Σε κάθε συγχρονισμό:',
      },
      {
        type: 'ul',
        items: [
          'ελέγχουμε κάθε προϊόν και εμφανίζουμε όσα έχουν τίτλο, τιμή, έγκυρο σύνδεσμο και απόθεμα·',
          'αποκρύπτουμε τα εξαντλημένα προϊόντα και αφαιρούμε όσα δεν υπάρχουν πια στην πηγή·',
          'αντιστοιχίζουμε το ίδιο προϊόν με τις προσφορές άλλων καταστημάτων μέσω EAN/GTIN ή μάρκας και MPN·',
          'μπορεί να συντομεύσουμε ή να μορφοποιήσουμε τις περιγραφές για λόγους παρουσίασης·',
          'μπορεί να αποκρύψουμε προϊόντα που δεν περνούν τους ελέγχους (βλ. ενότητα 9).',
        ],
      },
      {
        type: 'p',
        text: 'Διατηρείτε όλα τα δικαιώματα στα δεδομένα, τις φωτογραφίες και τα κείμενά σας και μας παραχωρείτε μη αποκλειστική άδεια να τα αναπαράγουμε, να τα προσαρμόζουμε όπως περιγράφεται παραπάνω και να τα εμφανίζουμε, όσο διαρκεί η συνεργασία και μόνο για τη λειτουργία του Tagora και τις υπηρεσίες που έχουμε συμφωνήσει χωριστά (ενότητα 8).',
      },

      { type: 'h2', text: '5. Ποια δεδομένα κρατάμε και ποια βλέπετε εσείς' },
      {
        type: 'p',
        text: 'Έχουμε πρόσβαση στα δεδομένα προϊόντων που μας δίνετε και σε όσα δημιουργούνται από τη χρήση του Tagora, όπως οι αναζητήσεις και οι μεταβάσεις, και τα χρησιμοποιούμε για να λειτουργούμε και να βελτιώνουμε την υπηρεσία. Στον πίνακα καταστήματος βλέπετε:',
      },
      {
        type: 'ul',
        items: [
          'πόσα προϊόντα σας εμφανίζονται·',
          'την κατάσταση κάθε συγχρονισμού και τα προβλήματα που εντοπίσαμε σε προϊόντα·',
          'πόσες μεταβάσεις σάς στείλαμε ανά ημέρα — μόνο τον αριθμό, χωρίς στοιχεία επισκεπτών.',
        ],
      },
      {
        type: 'p',
        text: 'Από τον πίνακα αλλάζετε επίσης τη σύνδεση της πηγής και τις ρυθμίσεις για τα έξοδα αποστολής. Προσωπικά δεδομένα επισκεπτών δεν σας παρέχουμε. Τα δεδομένα σας δεν τα δίνουμε σε τρίτους, πέρα από όσα εμφανίζονται δημόσια στον ιστότοπο, τους παρόχους που φιλοξενούν την υπηρεσία για λογαριασμό μας και, μόνο αν έχει συμφωνηθεί χωριστά, την Google για διαφημίσεις Shopping. Για τα προσωπικά δεδομένα των εκπροσώπων σας ισχύει η [Πολιτική Απορρήτου](/pages/privacy-policy).',
      },

      { type: 'h2', text: '6. Πώς κατατάσσονται τα προϊόντα' },
      { type: 'p', text: 'Οι κύριες παράμετροι που καθορίζουν τη σειρά εμφάνισης είναι:' },
      {
        type: 'ul',
        items: [
          'στα αποτελέσματα αναζήτησης, η **συνάφεια** με τους όρους αναζήτησης, δηλαδή το ταίριασμα στον τίτλο, τη μάρκα, το χρώμα, την κατηγορία και την περιγραφή, και στη συνέχεια η σειρά των παραλλαγών του προϊόντος·',
          'η ταξινόμηση που επιλέγει ο επισκέπτης: χαμηλότερη ή υψηλότερη τιμή, ή μεγαλύτερη έκπτωση·',
          'στη σελίδα ενός προϊόντος, η **συνολική τιμή μαζί με τα έξοδα αποστολής**· η φθηνότερη προσφορά φέρει την ένδειξη «Καλύτερη τιμή».',
        ],
      },
      {
        type: 'p',
        text: 'Τα πεδία μετρούν με τη σειρά που αναφέρονται, γιατί ένα ταίριασμα στον τίτλο δείχνει πιο αξιόπιστα ότι το προϊόν είναι αυτό που ψάχνει ο επισκέπτης.',
      },
      {
        type: 'p',
        text: '**Καμία πληρωμή δεν επηρεάζει την κατάταξη.** Σήμερα δεν υπάρχουν πληρωμένες θέσεις και κανένα κατάστημα δεν μπορεί να πληρώσει για να εμφανίζεται ψηλότερα. Αν στο μέλλον εισαγάγουμε χορηγούμενες θέσεις, θα φέρουν την ένδειξη «Χορηγούμενο» και θα σας ενημερώσουμε εκ των προτέρων τροποποιώντας τους όρους αυτούς. Αναλυτικά: [Πώς κατατάσσουμε τα αποτελέσματα](/pages/ranking).',
      },

      { type: 'h2', text: '7. Ίση μεταχείριση' },
      {
        type: 'p',
        text: 'Το Tagora δεν πουλά δικά του προϊόντα, οπότε δεν υπάρχει διαφοροποιημένη μεταχείριση υπέρ δικών μας προσφορών (άρθρο 7 του Κανονισμού P2B): όλα τα συνεργαζόμενα καταστήματα υπόκεινται στους ίδιους κανόνες. Επίσης, δεν σας εμποδίζουμε να προσφέρετε τα ίδια προϊόντα με διαφορετικούς όρους μέσω άλλων καναλιών.',
      },

      { type: 'h2', text: '8. Χρεώσεις' },
      { type: 'p', text: 'Οι χρεώσεις για την εμφάνιση των προϊόντων σας στο Tagora είναι οι εξής: [SHOP FEES].' },
      {
        type: 'p',
        text: 'Ως υπηρεσία σύγκρισης αγορών (CSS) της Google, μπορούμε επίσης να προβάλλουμε τα προϊόντα σας σε διαφημίσεις Google Shopping. Οι υπηρεσίες αυτές και οι χρεώσεις τους συμφωνούνται χωριστά και διέπονται από ξεχωριστή σύμβαση. Δεν επηρεάζουν την κατάταξη στον ιστότοπό μας.',
      },

      { type: 'h2', text: '9. Περιορισμός, αναστολή και λήξη' },
      {
        type: 'p',
        text: 'Μπορούμε να αποκρύψουμε μεμονωμένα προϊόντα ή να θέσουμε το κατάστημά σας σε παύση (αναστολή), οπότε αποκρύπτονται όλα τα προϊόντα του, για συγκεκριμένο λόγο, όπως:',
      },
      {
        type: 'ul',
        items: [
          'ανακριβείς ή παραπλανητικές τιμές, διαθεσιμότητα ή έξοδα αποστολής·',
          'πλασματικές εκπτώσεις ή παλιές τιμές που δεν τηρούν τον κανόνα των 30 ημερών·',
          'παράνομα ή μη ασφαλή προϊόντα ή περιεχόμενο που παραβιάζει δικαιώματα τρίτων·',
          'πηγή προϊόντων που δεν λειτουργεί για μεγάλο χρονικό διάστημα·',
          'κατάχρηση της υπηρεσίας ή άλλη παραβίαση των όρων αυτών·',
          'μη εξόφληση χρεώσεων, εφόσον ισχύουν χρεώσεις.',
        ],
      },
      {
        type: 'p',
        text: '**Όταν θέτουμε το κατάστημά σας σε παύση, σας στέλνουμε ταυτόχρονα email με την αιτιολογία** και τα συγκεκριμένα γεγονότα. Για προϊόντα που αποκρύπτονται στους αυτόματους ελέγχους, ο λόγος φαίνεται στην αναφορά συγχρονισμού. Μπορείτε να διευκρινίσετε τα γεγονότα ή να αμφισβητήσετε την απόφαση μέσω της ενότητας 11· αν το πρόβλημα διορθωθεί ή η απόφαση ανακληθεί, σας επαναφέρουμε χωρίς αδικαιολόγητη καθυστέρηση.',
      },
      { type: 'h3', text: 'Λήξη της συνεργασίας' },
      {
        type: 'p',
        text: 'Μπορούμε να τερματίσουμε τη συνεργασία στο σύνολό της με προειδοποίηση **τουλάχιστον 30 ημερών**, που σας στέλνουμε με email μαζί με την αιτιολογία. Χωρίς προειδοποίηση μπορούμε να τερματίσουμε μόνο όταν μας το επιβάλλει ο νόμος ή απόφαση αρχής, όταν συντρέχει επιτακτικός λόγος σύμφωνα με το εφαρμοστέο δίκαιο ή σε περίπτωση επανειλημμένης παραβίασης των όρων αυτών· και τότε σας στέλνουμε την αιτιολογία χωρίς αδικαιολόγητη καθυστέρηση.',
      },
      {
        type: 'p',
        text: 'Εσείς μπορείτε να αποχωρήσετε οποιαδήποτε στιγμή, ζητώντας το στο [CONTACT EMAIL]. Τα προϊόντα σας αφαιρούνται από τον ιστότοπο και η πρόσβαση στον πίνακα καταστήματος τερματίζεται. Ποια στοιχεία διατηρούμε μετά τη λήξη και για πόσο χρόνο περιγράφεται στην Πολιτική Απορρήτου.',
      },

      { type: 'h2', text: '10. Αλλαγές στους όρους' },
      {
        type: 'p',
        text: 'Για κάθε αλλαγή στους όρους αυτούς σας ενημερώνουμε με email **τουλάχιστον 15 ημέρες πριν ισχύσει**, ή νωρίτερα αν η αλλαγή απαιτεί σημαντικές τεχνικές προσαρμογές από μέρους σας. Αν δεν συμφωνείτε, μπορείτε να τερματίσετε τη συνεργασία πριν από την έναρξη ισχύος των αλλαγών. Συντομότερη προθεσμία εφαρμόζουμε μόνο όταν το επιβάλλει ο νόμος ή όταν πρέπει να αντιμετωπίσουμε άμεσο κίνδυνο απάτης, κακόβουλου λογισμικού, ανεπιθύμητων μηνυμάτων, παραβίασης δεδομένων ή άλλο κίνδυνο ασφάλειας. Οι αλλαγές δεν ισχύουν αναδρομικά.',
      },

      { type: 'h2', text: '11. Παράπονα και διαμεσολάβηση' },
      {
        type: 'p',
        text: 'Για οποιοδήποτε παράπονο, για παράδειγμα για απόρριψη αίτησης, απόκρυψη προϊόντων, παύση, κατάταξη ή τεχνικό πρόβλημα, γράψτε μας στο [CONTACT EMAIL]. Η διαδικασία είναι δωρεάν. Σας απαντάμε γραπτώς μέσα σε εύλογο χρόνο, ανάλογα με τη σημασία και την πολυπλοκότητα του ζητήματος.',
      },
      {
        type: 'p',
        text: 'Αν η διαφορά δεν επιλυθεί, μπορείτε να ζητήσετε διαμεσολάβηση. Οι διαμεσολαβητές με τους οποίους είμαστε πρόθυμοι να συνεργαστούμε είναι: [MEDIATORS]. Η διαμεσολάβηση είναι προαιρετική και δεν θίγει το δικαίωμά σας να προσφύγετε στα δικαστήρια.',
      },
      {
        type: 'p',
        text: 'Σημείωση: σύμφωνα με τον Κανονισμό P2B, τα άρθρα 11 (εσωτερικό σύστημα διαχείρισης καταγγελιών) και 12 (διαμεσολάβηση) δεν εφαρμόζονται σε παρόχους που είναι μικρές επιχειρήσεις κατά την έννοια του παραρτήματος της Σύστασης 2003/361/ΕΚ.',
      },

      { type: 'h2', text: '12. Ευθύνη' },
      {
        type: 'p',
        text: 'Είστε υπεύθυνοι για τα δεδομένα, τα προϊόντα και τις πωλήσεις σας και μας αποζημιώνετε για αξιώσεις τρίτων ή κυρώσεις αρχών που οφείλονται σε δικά σας ανακριβή ή παράνομα δεδομένα ή σε δικές σας παραβάσεις της νομοθεσίας.',
      },
      {
        type: 'p',
        text: 'Φροντίζουμε η υπηρεσία να λειτουργεί σωστά, αλλά δεν εγγυόμαστε αδιάλειπτη λειτουργία ούτε συγκεκριμένο αριθμό μεταβάσεων ή πωλήσεων. Στον βαθμό που επιτρέπει ο νόμος, δεν ευθυνόμαστε για διαφυγόντα κέρδη ή έμμεσες ζημίες. Δεν περιορίζεται όμως η ευθύνη για δόλο ή βαριά αμέλεια ούτε άλλη ευθύνη που δεν μπορεί να περιοριστεί κατά νόμο.',
      },

      { type: 'h2', text: '13. Σύνδεσμοι σύνδεσης' },
      {
        type: 'p',
        text: 'Στον πίνακα καταστήματος συνδέεστε με σύνδεσμο μίας χρήσης που στέλνουμε στο email που δηλώσατε. Οι σύνδεσμοι αυτοί είναι εμπιστευτικοί: μην τους προωθείτε σε άλλους και κρατήστε τον λογαριασμό email σας ασφαλή. Ό,τι γίνεται μέσω τέτοιου συνδέσμου θεωρείται ότι έγινε από εσάς. Αν υποψιάζεστε μη εξουσιοδοτημένη πρόσβαση, ενημερώστε μας αμέσως στο [CONTACT EMAIL].',
      },

      { type: 'h2', text: '14. Εφαρμοστέο δίκαιο' },
      {
        type: 'p',
        text: 'Οι όροι αυτοί διέπονται από το ελληνικό δίκαιο. Για κάθε διαφορά αρμόδια είναι τα δικαστήρια [COURTS CITY], με την επιφύλαξη της διαμεσολάβησης της ενότητας 11.',
      },

      { type: 'h2', text: '15. Επικοινωνία' },
      { type: 'p', text: '**[COMPANY LEGAL NAME]**, [ADDRESS] · ΓΕΜΗ [GEMI NUMBER] · ΑΦΜ [VAT NUMBER]' },
      { type: 'ul', items: ['Email: [CONTACT EMAIL]', 'Τηλέφωνο: [CUSTOMER SERVICE PHONE]'] },
      {
        type: 'p',
        text: 'Τις ειδοποιήσεις που προβλέπουν οι όροι αυτοί τις στέλνουμε στο email της αίτησής σας· ενημερώστε μας αν αλλάξει.',
      },
    ],
  },

  en: {
    title: 'Terms for partner shops',
    updated: 'Last updated: [LAST UPDATED DATE]',
    intro:
      'These terms govern how Tagora works with the online shops that show their products on it (“partner shops”) and cover, in plain language, what Regulation (EU) 2019/1150 on platform-to-business relations (the P2B Regulation) requires. By applying, you accept them.',
    blocks: [
      { type: 'h2', text: '1. Who we are and what we do' },
      {
        type: 'p',
        text: 'Tagora is operated by **[COMPANY LEGAL NAME]**, [ADDRESS], GEMI no. [GEMI NUMBER], VAT no. [VAT NUMBER] (“we”, “us”). It is a price-comparison website and a Comparison Shopping Service (CSS) for Google Shopping, serving visitors in Greece, Cyprus, Ireland and Malta.',
      },
      {
        type: 'p',
        text: 'Visitors search and compare your products, and one click takes them to your website to buy. **We do not sell, do not take payments and are not a party to any sales contract.** You are the seller, and you carry all of a seller’s obligations towards the consumer.',
      },

      { type: 'h2', text: '2. Who can apply and how' },
      {
        type: 'p',
        text: 'Any business that runs an online shop selling to consumers in one or more of the countries we serve may apply. The person applying must be authorised to act for the business. You apply on our [page for shops](/shops), where you give your business details and connect one product source:',
      },
      {
        type: 'ul',
        items: [
          'an XML feed in Skroutz, BestPrice or Google Shopping format, or a CSV file;',
          'your Shopify store address, from which we read the public products.json catalogue;',
          'your WooCommerce shop address, from which we read the public Store API.',
        ],
      },
      {
        type: 'p',
        text: 'We review every application and approve or reject it at our discretion. **If we reject your application, we email you the reason.** You can reply to clarify or correct something and ask us to reconsider.',
      },

      { type: 'h2', text: '3. What you provide and promise' },
      { type: 'p', text: 'You are responsible for your product data. You promise that:' },
      {
        type: 'ul',
        items: [
          'the data is **accurate, lawful and not misleading** (title, brand, description, category and, where they exist, EAN/GTIN and MPN codes);',
          'prices are **real, current final prices including VAT**, the same as your website charges;',
          'availability is real and kept up to date in your source;',
          'the delivery costs you give, in your source or in your dashboard settings, are correct;',
          'every link leads to the right product page on your website;',
          'you hold the rights to the images, texts and trade marks you include, so that you can license them to us (section 4);',
          'you comply with consumer protection law and all other law that applies to your sales, and you do not offer unlawful or unsafe products.',
        ],
      },
      { type: 'h3', text: 'Old prices and discounts' },
      {
        type: 'p',
        text: 'If you show a reduced price together with a previous price (for example through a sale_price field or a compare price), the previous price must be **the lowest price you applied in the 30 days** before the reduction. This is required by Article 6a of Directive 98/6/EC, as amended by Directive (EU) 2019/2161 (the Omnibus Directive), and by the national laws implementing it. Invented or inflated old prices are not allowed.',
      },

      { type: 'h2', text: '4. What we do with your product data' },
      {
        type: 'p',
        text: 'We read your source automatically about every 6 hours; you can also start a sync at once with the “Sync now” button in your dashboard. On each sync we:',
      },
      {
        type: 'ul',
        items: [
          'check every product and show those with a title, price, valid link and stock;',
          'hide out-of-stock products and remove products that are no longer in your source;',
          'match the same product with other shops’ offers by EAN/GTIN or by brand and MPN;',
          'may shorten or format descriptions for display;',
          'may hide products that fail our checks (see section 9).',
        ],
      },
      {
        type: 'p',
        text: 'You keep all rights in your data, images and texts, and you grant us a non-exclusive licence to copy them, adapt them as described above and display them, for as long as we work together and only to run Tagora and any services we have agreed separately (section 8).',
      },

      { type: 'h2', text: '5. What data we keep and what you see' },
      {
        type: 'p',
        text: 'We have access to the product data you provide and to data created when people use Tagora, such as searches and click-outs, and we use it to run and improve the service. In your dashboard you can see:',
      },
      {
        type: 'ul',
        items: [
          'how many of your products are online;',
          'the status of each sync and any problems we found with products;',
          'how many click-outs we sent you each day: counts only, with no visitor data.',
        ],
      },
      {
        type: 'p',
        text: 'In the dashboard you can also change your source connection and your delivery cost settings. We do not give you visitors’ personal data. We do not pass your data to third parties, apart from what is shown publicly on the website, the providers who host the service on our behalf and, only where agreed separately, Google for Shopping ads. The personal data of your staff is covered by our [Privacy Policy](/pages/privacy-policy).',
      },

      { type: 'h2', text: '6. How products are ranked' },
      { type: 'p', text: 'The main parameters that decide the order are:' },
      {
        type: 'ul',
        items: [
          'in search results, **relevance** to the search terms, meaning text matches in the title, brand, colour, category and description, and then the order of the product’s variants;',
          'the sort order the visitor chooses: lowest or highest price, or biggest discount;',
          'on a product page, the **total price including delivery**; the cheapest offer is labelled “Best price”.',
        ],
      },
      {
        type: 'p',
        text: 'The fields count in the order listed, because a match in the title is the most reliable sign that a product is what the visitor wants.',
      },
      {
        type: 'p',
        text: '**No payment influences ranking.** There are no paid placements today, and no shop can pay to rank higher. If we ever introduce sponsored placements, they will be labelled “Sponsored” and we will tell you in advance by changing these terms. In detail: [How we rank results](/pages/ranking).',
      },

      { type: 'h2', text: '7. Equal treatment' },
      {
        type: 'p',
        text: 'Tagora does not sell any products of its own, so there is no differentiated treatment in favour of our own offers (Article 7 of the P2B Regulation): all partner shops are subject to the same rules. We also do not stop you from offering the same products on different terms through other channels.',
      },

      { type: 'h2', text: '8. Fees' },
      { type: 'p', text: 'The fees for showing your products on Tagora are: [SHOP FEES].' },
      {
        type: 'p',
        text: 'As a Google Comparison Shopping Service (CSS), we may also place your products in Google Shopping ads. Those services and their fees are agreed separately and governed by a separate agreement. They do not affect ranking on our website.',
      },

      { type: 'h2', text: '9. Restriction, suspension and termination' },
      {
        type: 'p',
        text: 'We may hide individual products, or pause (suspend) your shop so that all its products are hidden, for a specific reason, such as:',
      },
      {
        type: 'ul',
        items: [
          'inaccurate or misleading prices, availability or delivery costs;',
          'fake discounts, or old prices that do not follow the 30-day rule;',
          'unlawful or unsafe products, or content that infringes other people’s rights;',
          'a product source that has not worked for an extended period;',
          'abuse of the service or another breach of these terms;',
          'non-payment, where fees apply.',
        ],
      },
      {
        type: 'p',
        text: '**When we pause your shop, we email you the reasons at the same time**, with the specific facts. For products hidden by our automatic checks, the reason appears in your sync report. You can clarify the facts or challenge the decision through the process in section 11; once the problem is fixed or the decision is reversed, we restore your shop without undue delay.',
      },
      { type: 'h3', text: 'Ending the partnership' },
      {
        type: 'p',
        text: 'We may end the partnership as a whole by giving you **at least 30 days’ notice** by email, together with the reasons. We may end it without notice only where the law or an authority requires it, where there is an imperative reason under applicable law, or in case of repeated breaches of these terms; we then send you the reasons without undue delay.',
      },
      {
        type: 'p',
        text: 'You may leave at any time by asking us at [CONTACT EMAIL]. Your products are removed from the website and your dashboard access ends. Which data we keep after that, and for how long, is described in the Privacy Policy.',
      },

      { type: 'h2', text: '10. Changes to these terms' },
      {
        type: 'p',
        text: 'We email you about any change to these terms **at least 15 days before it applies**, or earlier if the change requires significant technical adjustments on your side. If you do not agree, you may end the partnership before the change applies. We use a shorter period only where the law requires it or where we must deal with an imminent risk of fraud, malware, spam, data breaches or another security threat. Changes never apply retroactively.',
      },

      { type: 'h2', text: '11. Complaints and mediation' },
      {
        type: 'p',
        text: 'For any complaint, for example about a rejected application, hidden products, a pause, ranking or a technical problem, write to us at [CONTACT EMAIL]. The process is free of charge. We reply in writing within a reasonable time, depending on the importance and complexity of the issue.',
      },
      {
        type: 'p',
        text: 'If the dispute is not resolved, you can ask for mediation. The mediators we are willing to work with are: [MEDIATORS]. Mediation is voluntary and does not affect your right to go to court.',
      },
      {
        type: 'p',
        text: 'Note: under the P2B Regulation, Articles 11 (internal complaint handling) and 12 (mediation) do not apply to providers that are small enterprises within the meaning of the Annex to Recommendation 2003/361/EC.',
      },

      { type: 'h2', text: '12. Liability' },
      {
        type: 'p',
        text: 'You are responsible for your data, products and sales, and you will compensate us for third-party claims or penalties from authorities caused by your inaccurate or unlawful data or by your breach of the law.',
      },
      {
        type: 'p',
        text: 'We take care to keep the service working properly, but we do not guarantee uninterrupted operation or any particular number of click-outs or sales. As far as the law allows, we are not liable for lost profits or indirect loss. This does not limit liability for wilful misconduct or gross negligence, or any other liability that cannot be limited by law.',
      },

      { type: 'h2', text: '13. Sign-in links' },
      {
        type: 'p',
        text: 'You sign in to your dashboard with a one-time link we send to the email address you gave us. These links are confidential: do not forward them to anyone, and keep your email account secure. Anything done through such a link is treated as done by you. If you suspect unauthorised access, tell us at once at [CONTACT EMAIL].',
      },

      { type: 'h2', text: '14. Governing law' },
      {
        type: 'p',
        text: 'These terms are governed by Greek law. The courts of [COURTS CITY] have jurisdiction over any dispute, without prejudice to the mediation described in section 11.',
      },

      { type: 'h2', text: '15. Contact' },
      { type: 'p', text: '**[COMPANY LEGAL NAME]**, [ADDRESS] · GEMI [GEMI NUMBER] · VAT [VAT NUMBER]' },
      { type: 'ul', items: ['Email: [CONTACT EMAIL]', 'Phone: [CUSTOMER SERVICE PHONE]'] },
      {
        type: 'p',
        text: 'We send the notices these terms require to the email address in your application; please tell us if it changes.',
      },
    ],
  },
};
