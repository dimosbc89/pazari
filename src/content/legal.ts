// Legal content for Pazari: Privacy Policy and Cookies Policy (Greek / English).
// Bracketed ALL-CAPS placeholders must be filled in by the operator before launch.

export type LegalBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string } // plain text; may contain **bold** spans only
  | { type: 'ul'; items: string[] } // items may contain **bold** spans only
  | { type: 'table'; head: string[]; rows: string[][] };

export interface LegalPage {
  title: string;
  updated: string;
  intro: string;
  blocks: LegalBlock[];
}

/* -------------------------------------------------------------------------- */
/*                               PRIVACY POLICY                               */
/* -------------------------------------------------------------------------- */

export const privacyPolicy: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Πολιτική Απορρήτου',
    updated: 'Τελευταία ενημέρωση: [LAST UPDATED DATE]',
    intro:
      'Η πολιτική αυτή εξηγεί ποια προσωπικά δεδομένα επεξεργάζεται το Pazari όταν χρησιμοποιείτε τον ιστότοπό μας, για ποιον λόγο και ποια δικαιώματα έχετε. Σχεδιάσαμε το Pazari ώστε να συλλέγει όσο το δυνατόν λιγότερα: δεν υπάρχουν λογαριασμοί χρηστών, εγγραφή ή newsletter, και μπορείτε να συγκρίνετε τιμές χωρίς να μας πείτε ποιος είστε.',
    blocks: [
      { type: 'h2', text: '1. Ποιοι είμαστε' },
      {
        type: 'p',
        text: 'Το Pazari είναι υπηρεσία σύγκρισης τιμών που λειτουργεί η εταιρεία **[COMPANY LEGAL NAME]**, [ADDRESS], αριθ. ΓΕΜΗ [GEMI NUMBER], ΑΦΜ [VAT NUMBER] («εμείς»). Είμαστε ο υπεύθυνος επεξεργασίας για όσα περιγράφονται εδώ. Για οποιαδήποτε ερώτηση ή αίτημα σχετικά με τα προσωπικά σας δεδομένα, γράψτε μας στο **[CONTACT EMAIL]**.',
      },
      {
        type: 'p',
        text: 'Το Pazari είναι υπηρεσία σύγκρισης αγορών (Comparison Shopping Service – CSS) στο Google Shopping. Μπορείτε να αναζητάτε προϊόντα, να εφαρμόζετε φίλτρα, να συγκρίνετε προσφορές από πολλά ηλεκτρονικά καταστήματα και στη συνέχεια να μεταβαίνετε στο κατάστημα της επιλογής σας για να αγοράσετε. Εμείς δεν πουλάμε προϊόντα, δεν εισπράττουμε πληρωμές και δεν βλέπουμε ποτέ τα στοιχεία της παραγγελίας, της αποστολής ή της πληρωμής σας.',
      },

      { type: 'h2', text: '2. Τι συλλέγουμε και γιατί' },
      { type: 'h3', text: 'Αρχεία καταγραφής διακομιστή και CDN' },
      {
        type: 'p',
        text: 'Κάθε φορά που το πρόγραμμα περιήγησής σας φορτώνει μια σελίδα, η υποδομή φιλοξενίας και διανομής περιεχομένου (CDN) καταγράφει αυτόματα ορισμένα τεχνικά στοιχεία: τη διεύθυνση IP σας, τις πληροφορίες για το πρόγραμμα περιήγησης και τη συσκευή σας (user agent), την ημερομηνία και την ώρα, καθώς και τη διεύθυνση της σελίδας που ζητήθηκε. Τα χρησιμοποιούμε για τη λειτουργία και την προστασία του ιστότοπου, για τον εντοπισμό καταχρήσεων, όπως επιθέσεων ή αυτοματοποιημένης αντιγραφής περιεχομένου, και για τη διόρθωση σφαλμάτων.',
      },
      { type: 'h3', text: 'Αναζητήσεις, φίλτρα και μεταβάσεις σε καταστήματα' },
      {
        type: 'p',
        text: 'Καταγράφουμε ποιες αναζητήσεις γίνονται, ποια φίλτρα επιλέγονται και σε ποιες προσφορές γίνεται κλικ, ώστε να βελτιώνουμε τα αποτελέσματα και να ενημερώνουμε τα συνεργαζόμενα καταστήματα για το πόσες επισκέψεις τους στείλαμε. Τα στοιχεία αυτά αναλύονται σε συγκεντρωτική μορφή και δεν χρησιμοποιούνται για να δημιουργηθεί προφίλ σας. Σας παρακαλούμε να μην πληκτρολογείτε προσωπικές πληροφορίες, όπως το όνομα ή το τηλέφωνό σας, στο πεδίο αναζήτησης.',
      },
      { type: 'h3', text: 'Προτίμηση χώρας και γλώσσας' },
      {
        type: 'p',
        text: 'Όταν επιλέγετε χώρα ή γλώσσα, αποθηκεύουμε την επιλογή σας στον τοπικό χώρο αποθήκευσης (localStorage) του προγράμματος περιήγησής σας, ώστε ο ιστότοπος να ανοίγει σωστά την επόμενη φορά. Η πληροφορία μένει στη συσκευή σας και δεν τη χρησιμοποιούμε για να σας παρακολουθούμε.',
      },
      { type: 'h3', text: 'Οι επιλογές σας για τα cookies' },
      {
        type: 'p',
        text: 'Αποθηκεύουμε την επιλογή σας για τα cookies (αποδοχή όλων ή μόνο τα απαραίτητα), ώστε να μη σας ρωτάμε σε κάθε επίσκεψη και να μπορούμε να αποδείξουμε, όπου απαιτείται, ότι δώσατε τη συγκατάθεσή σας.',
      },
      { type: 'h3', text: 'Προαιρετικά εργαλεία ανάλυσης και διαφήμισης' },
      {
        type: 'p',
        text: 'Μόνο εφόσον συμφωνήσετε, φορτώνουμε εργαλεία της Google, όπως το Google Analytics 4, το Google Tag Manager και τη μέτρηση μετατροπών του Google Ads. Μας βοηθούν να καταλαβαίνουμε πώς χρησιμοποιείται ο ιστότοπος και να μετράμε την αποτελεσματικότητα των διαφημίσεών μας. Μπορεί να συλλέγουν ένα διαδικτυακό αναγνωριστικό, στοιχεία συσκευής και προγράμματος περιήγησης, τις σελίδες που βλέπετε και τις ενέργειές σας σε αυτές. Αν δεν δώσετε συγκατάθεση, τα εργαλεία αυτά δεν φορτώνονται καθόλου. Λεπτομέρειες θα βρείτε στην Πολιτική Cookies.',
      },

      { type: 'h3', text: 'Καταστήματα που συνεργάζονται μαζί μας' },
      {
        type: 'p',
        text: 'Αν εκπροσωπείτε κατάστημα που κάνει αίτηση στο Pazari, επεξεργαζόμαστε όσα μας δίνετε στη φόρμα: όνομα υπευθύνου, email, τηλέφωνο, επωνυμία και ΑΦΜ της επιχείρησης, ιστότοπο και διεύθυνση του καταλόγου προϊόντων. Τα χρησιμοποιούμε για να εξετάσουμε την αίτηση, να επικοινωνούμε μαζί σας, να συγχρονίζουμε τα προϊόντα σας και να σας δείχνουμε στατιστικά, όπως πόσες μεταβάσεις σάς στείλαμε ανά ημέρα (μόνο ο αριθμός, χωρίς στοιχεία επισκεπτών). Για τη σύνδεση στον πίνακα του καταστήματος σάς στέλνουμε με email σύνδεσμο μίας χρήσης· μετά τη σύνδεση ορίζουμε το απολύτως απαραίτητο cookie **pazari_session**.',
      },

      { type: 'h2', text: '3. Νομικές βάσεις και χρόνος διατήρησης' },
      {
        type: 'table',
        head: ['Σκοπός', 'Νομική βάση', 'Χρόνος διατήρησης'],
        rows: [
          [
            'Λειτουργία και ασφάλεια του ιστότοπου (αρχεία καταγραφής)',
            'Έννομο συμφέρον (άρθρο 6 παρ. 1 στοιχ. στ΄ ΓΚΠΔ): μια διαθέσιμη και ασφαλής υπηρεσία',
            '[LOG RETENTION DAYS] ημέρες· περισσότερο μόνο αν χρειάζεται για τη διερεύνηση συγκεκριμένου περιστατικού',
          ],
          [
            'Βελτίωση της αναζήτησης και αναφορά μεταβάσεων στα καταστήματα',
            'Έννομο συμφέρον (άρθρο 6 παρ. 1 στοιχ. στ΄ ΓΚΠΔ): μια χρήσιμη υπηρεσία σύγκρισης και ακριβής ενημέρωση των συνεργατών μας',
            'Μεμονωμένα συμβάντα έως [EVENT RETENTION DAYS] ημέρες· στη συνέχεια μόνο συγκεντρωτικά στατιστικά χωρίς αναγνωριστικά',
          ],
          [
            'Απομνημόνευση χώρας και γλώσσας',
            'Έννομο συμφέρον (άρθρο 6 παρ. 1 στοιχ. στ΄ ΓΚΠΔ)· απολύτως απαραίτητη αποθήκευση, χωρίς ανάγκη συγκατάθεσης',
            'Μέχρι να τη διαγράψετε από το πρόγραμμα περιήγησης',
          ],
          [
            'Καταγραφή της επιλογής σας για τα cookies',
            'Νομική υποχρέωση (άρθρο 6 παρ. 1 στοιχ. γ΄ και άρθρο 7 παρ. 1 ΓΚΠΔ): απόδειξη της συγκατάθεσης',
            '12 μήνες· έπειτα σας ρωτάμε ξανά',
          ],
          [
            'Στατιστικά επισκεψιμότητας και μέτρηση διαφημίσεων',
            'Συγκατάθεση (άρθρο 6 παρ. 1 στοιχ. α΄ ΓΚΠΔ και άρθρο 4 παρ. 5 ν. 3471/2006)',
            'Μέχρι να ανακαλέσετε τη συγκατάθεσή σας· η διάρκεια κάθε cookie αναφέρεται στην Πολιτική Cookies',
          ],
          [
            'Αιτήσεις και λογαριασμοί καταστημάτων',
            'Εκτέλεση σύμβασης και προσυμβατικά μέτρα (άρθρο 6 παρ. 1 στοιχ. β΄ ΓΚΠΔ)',
            'Όσο διαρκεί η συνεργασία και έως [MERCHANT RETENTION] μετά τη λήξη της· οι σύνδεσμοι σύνδεσης λήγουν σε 30 λεπτά και οι συνεδρίες σε 30 ημέρες',
          ],
        ],
      },
      {
        type: 'p',
        text: 'Όπου βασιζόμαστε στο έννομο συμφέρον μας, το έχουμε σταθμίσει με τα δικαιώματά σας και κρατάμε μόνο τα δεδομένα που είναι πραγματικά απαραίτητα. Μπορείτε να αντιταχθείτε οποιαδήποτε στιγμή (βλ. ενότητα 7).',
      },

      { type: 'h2', text: '4. Ποιος λαμβάνει τα δεδομένα σας' },
      {
        type: 'p',
        text: 'Δεν πουλάμε προσωπικά δεδομένα. Τα μοιραζόμαστε μόνο με παρόχους που τα επεξεργάζονται για λογαριασμό μας, βάσει γραπτής σύμβασης και σύμφωνα με τις οδηγίες μας:',
      },
      {
        type: 'ul',
        items: [
          'τον **πάροχο φιλοξενίας και CDN** ([HOSTING PROVIDER]), που εξυπηρετεί τον ιστότοπο και τηρεί τα αρχεία καταγραφής·',
          'το **Typesense Cloud**, που φιλοξενεί τη μηχανή αναζήτησης προϊόντων και επεξεργάζεται τα αιτήματα αναζήτησης·',
          'τον **πάροχο αποστολής email** ([EMAIL PROVIDER]), που στέλνει στα καταστήματα τα email σύνδεσης και ενημέρωσης·',
          'την **Google**, μόνο εφόσον έχετε συναινέσει σε cookies ανάλυσης ή διαφήμισης.',
        ],
      },
      {
        type: 'p',
        text: 'Ενδέχεται επίσης να γνωστοποιήσουμε δεδομένα σε δημόσιες αρχές, όταν το επιβάλλει ο νόμος, ή όταν είναι αναγκαίο για τη θεμελίωση, την άσκηση ή την υπεράσπιση νομικών αξιώσεων. Στα συνεργαζόμενα καταστήματα δίνουμε στοιχεία για τις μεταβάσεις μόνο σε συγκεντρωτική μορφή.',
      },

      { type: 'h2', text: '5. Όταν μεταβαίνετε σε κατάστημα' },
      {
        type: 'p',
        text: 'Όταν κάνετε κλικ σε μια προσφορά, μεταφέρεστε στον ιστότοπο του καταστήματος. Από εκείνη τη στιγμή υπεύθυνο για τα δεδομένα σας είναι το κατάστημα και ισχύει η δική του πολιτική απορρήτου, την οποία καλό είναι να διαβάσετε πριν αγοράσετε. Το κατάστημα μπορεί να γνωρίζει ότι φτάσατε από το Pazari, μέσω της διεύθυνσης παραπομπής (referrer) που στέλνει το πρόγραμμα περιήγησής σας και μέσω παραμέτρων παρακολούθησης (π.χ. UTM) που προστίθενται στον σύνδεσμο. Οι παράμετροι αυτές περιγράφουν την πηγή ή την καμπάνια, όχι το ποιος είστε.',
      },
      {
        type: 'p',
        text: 'Αν μας βρήκατε μέσω του Google Shopping, για τη δραστηριότητά σας στις υπηρεσίες της Google ισχύει η πολιτική απορρήτου της Google.',
      },

      { type: 'h2', text: '6. Διαβιβάσεις εκτός ΕΟΧ' },
      {
        type: 'p',
        text: 'Ορισμένοι πάροχοί μας ή οι υπεργολάβοι τους ενδέχεται να επεξεργάζονται δεδομένα εκτός του Ευρωπαϊκού Οικονομικού Χώρου, για παράδειγμα στις ΗΠΑ. Σε αυτή την περίπτωση στηριζόμαστε σε απόφαση επάρκειας της Ευρωπαϊκής Επιτροπής, όπως το Πλαίσιο Προστασίας Δεδομένων ΕΕ–ΗΠΑ (EU–US Data Privacy Framework) για τις πιστοποιημένες εταιρείες, ή στις τυποποιημένες συμβατικές ρήτρες της Επιτροπής, μαζί με πρόσθετα μέτρα όπου χρειάζεται. Μπορείτε να μας ζητήσετε λεπτομέρειες για τις εγγυήσεις αυτές.',
      },

      { type: 'h2', text: '7. Τα δικαιώματά σας' },
      {
        type: 'p',
        text: 'Σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (ΓΚΠΔ) και τον ν. 4624/2019, έχετε δικαίωμα:',
      },
      {
        type: 'ul',
        items: [
          '**πρόσβασης** στα δεδομένα που τηρούμε για εσάς και λήψης αντιγράφου τους·',
          '**διόρθωσης** ανακριβών δεδομένων·',
          '**διαγραφής**, όταν δεν υπάρχει πλέον λόγος να διατηρούνται·',
          '**περιορισμού** της επεξεργασίας σε ορισμένες περιπτώσεις·',
          '**εναντίωσης** στην επεξεργασία που βασίζεται στο έννομο συμφέρον μας·',
          '**φορητότητας** των δεδομένων που μας έχετε δώσει, όταν η επεξεργασία βασίζεται σε συγκατάθεση ή σύμβαση και γίνεται με αυτοματοποιημένα μέσα·',
          '**ανάκλησης της συγκατάθεσής σας** οποιαδήποτε στιγμή, από τον σύνδεσμο «Ρυθμίσεις cookies» στο κάτω μέρος κάθε σελίδας, χωρίς να θίγεται η νομιμότητα της επεξεργασίας που προηγήθηκε.',
        ],
      },
      {
        type: 'p',
        text: 'Για να ασκήσετε κάποιο δικαίωμα, στείλτε email στο **[CONTACT EMAIL]**. Θα σας απαντήσουμε μέσα σε έναν μήνα ή, για σύνθετα αιτήματα, μέσα σε τρεις μήνες, οπότε θα σας ενημερώσουμε σχετικά. Επειδή δεν τηρούμε λογαριασμούς, συχνά δεν μπορούμε να συνδέσουμε δεδομένα με συγκεκριμένο πρόσωπο. Για να εντοπίσουμε αρχεία καταγραφής που σας αφορούν, ίσως χρειαστεί να μας δώσετε στοιχεία όπως τη διεύθυνση IP σας και την κατά προσέγγιση ώρα της επίσκεψής σας. Αν και πάλι δεν μπορούμε να σας ταυτοποιήσουμε, θα σας εξηγήσουμε τον λόγο.',
      },
      { type: 'h3', text: 'Καταγγελία σε εποπτική αρχή' },
      {
        type: 'p',
        text: 'Αν θεωρείτε ότι η επεξεργασία των δεδομένων σας παραβιάζει τη νομοθεσία, μπορείτε να υποβάλετε καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr), που είναι η επικεφαλής εποπτική μας αρχή. Αν διαμένετε στην Κύπρο, την Ιρλανδία ή τη Μάλτα, μπορείτε επίσης να απευθυνθείτε στην αρχή της χώρας σας: στο Γραφείο Επιτρόπου Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (Κύπρος), στην Επιτροπή Προστασίας Δεδομένων (Data Protection Commission) της Ιρλανδίας ή στον Επίτροπο Πληροφόρησης και Προστασίας Δεδομένων (IDPC) της Μάλτας.',
      },

      { type: 'h2', text: '8. Ασφάλεια' },
      {
        type: 'p',
        text: 'Ο ιστότοπος λειτουργεί αποκλειστικά μέσω κρυπτογραφημένης σύνδεσης (HTTPS). Πρόσβαση στα αρχεία καταγραφής και στα συστήματά μας έχουν μόνο όσοι τη χρειάζονται για τη δουλειά τους, και ελέγχουμε τις δεσμεύσεις ασφάλειας των παρόχων μας πριν συνεργαστούμε μαζί τους.',
      },

      { type: 'h2', text: '9. Χωρίς προφίλ και αυτοματοποιημένες αποφάσεις' },
      {
        type: 'p',
        text: 'Δεν λαμβάνουμε αποφάσεις για εσάς αποκλειστικά με αυτοματοποιημένα μέσα που παράγουν έννομα ή παρόμοια σημαντικά αποτελέσματα. Η σειρά εμφάνισης των προσφορών εξαρτάται από το προϊόν, την τιμή, τη διαθεσιμότητα και άλλα στοιχεία της προσφοράς, όχι από κάποιο προφίλ σας.',
      },

      { type: 'h2', text: '10. Παιδιά' },
      {
        type: 'p',
        text: 'Το Pazari δεν απευθύνεται σε παιδιά κάτω των 15 ετών, που είναι η ηλικία ψηφιακής συγκατάθεσης στην Ελλάδα. Δεν συλλέγουμε εν γνώσει μας δεδομένα παιδιών. Αν πιστεύετε ότι ένα παιδί έδωσε συγκατάθεση ή μας παρείχε δεδομένα, επικοινωνήστε μαζί μας και θα τα διαγράψουμε.',
      },

      { type: 'h2', text: '11. Αλλαγές στην πολιτική' },
      {
        type: 'p',
        text: 'Ενδέχεται να επικαιροποιούμε την πολιτική αυτή όταν αλλάζει η υπηρεσία μας ή η νομοθεσία. Η ημερομηνία στην αρχή της σελίδας δείχνει την ισχύουσα έκδοση. Αν μια αλλαγή είναι ουσιώδης, για παράδειγμα νέος σκοπός επεξεργασίας ή νέα κατηγορία αποδεκτών, θα την επισημάνουμε με εμφανή τρόπο στον ιστότοπο.',
      },
    ],
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: [LAST UPDATED DATE]',
    intro:
      'This policy explains what personal data Pazari processes when you use our website, why we process it and what rights you have. We built Pazari to collect as little as possible: there are no user accounts, no sign-up and no newsletter, and you can compare prices without telling us who you are.',
    blocks: [
      { type: 'h2', text: '1. Who we are' },
      {
        type: 'p',
        text: 'Pazari is a price-comparison service operated by **[COMPANY LEGAL NAME]**, [ADDRESS], General Commercial Registry (GEMI) no. [GEMI NUMBER], VAT no. [VAT NUMBER] (“we”, “us”). We are the data controller for the processing described here. For any question or request about your personal data, write to **[CONTACT EMAIL]**.',
      },
      {
        type: 'p',
        text: 'Pazari is a Comparison Shopping Service (CSS) in Google Shopping. You can search for products, apply filters, compare offers from many online shops and then go to the shop of your choice to buy. We do not sell products, we do not take payments and we never see your order, delivery or payment details.',
      },

      { type: 'h2', text: '2. What we collect and why' },
      { type: 'h3', text: 'Server and CDN logs' },
      {
        type: 'p',
        text: 'Each time your browser loads a page, our hosting and content delivery network (CDN) automatically record some technical data: your IP address, the browser and device information your browser sends (user agent), the date and time, and the address of the page requested. We use these logs to run the website, keep it secure, detect abuse such as attacks or automated copying of content, and fix errors.',
      },
      { type: 'h3', text: 'Searches, filters and click-outs' },
      {
        type: 'p',
        text: 'We record which searches are made, which filters are applied and which offers are clicked, so that we can improve results and tell partner shops how many visits we sent them. These events are analysed in aggregated form and are not used to build a profile of you. Please avoid typing personal information, such as your name or phone number, into the search box.',
      },
      { type: 'h3', text: 'Your country and language preference' },
      {
        type: 'p',
        text: 'When you choose a country or language, we save that choice in your browser’s local storage (localStorage) so the site opens the right way next time. It stays on your device and we do not use it to track you.',
      },
      { type: 'h3', text: 'Your cookie choices' },
      {
        type: 'p',
        text: 'We store your cookie choice (accept all, or necessary only) so that we do not ask you again on every visit and can show, where required, that you gave your consent.',
      },
      { type: 'h3', text: 'Optional analytics and advertising' },
      {
        type: 'p',
        text: 'Only if you agree, we load Google tools such as Google Analytics 4, Google Tag Manager and Google Ads conversion measurement. They help us understand how the website is used and measure how well our advertising works. They may collect an online identifier, device and browser data, the pages you view and how you interact with them. If you do not consent, these tools are not loaded at all. Details are in our Cookies Policy.',
      },

      { type: 'h3', text: 'Shops that work with us' },
      {
        type: 'p',
        text: 'If you represent a shop that applies to Pazari, we process what you give us in the form: contact name, email, phone, company name and VAT number, website and the address of your product catalogue. We use it to review the application, contact you, sync your products and show you statistics, such as how many click-outs we sent you per day (a count only, with no visitor data). To sign in to the shop dashboard we email you a one-time link; once signed in, we set the strictly necessary cookie **pazari_session**.',
      },

      { type: 'h2', text: '3. Legal bases and retention' },
      {
        type: 'table',
        head: ['Purpose', 'Legal basis', 'Retention'],
        rows: [
          [
            'Running and securing the website (logs)',
            'Legitimate interest (Art. 6(1)(f) GDPR): an available and secure service',
            '[LOG RETENTION DAYS] days; longer only if needed to investigate a specific incident',
          ],
          [
            'Improving search and reporting click-outs to shops',
            'Legitimate interest (Art. 6(1)(f) GDPR): a useful comparison service and accurate reporting to our partners',
            'Individual events up to [EVENT RETENTION DAYS] days; after that, only aggregated statistics with no identifiers',
          ],
          [
            'Remembering your country and language',
            'Legitimate interest (Art. 6(1)(f) GDPR); strictly necessary storage that needs no consent',
            'Until you clear it in your browser',
          ],
          [
            'Recording your cookie choice',
            'Legal obligation (Art. 6(1)(c) and Art. 7(1) GDPR): being able to demonstrate consent',
            '12 months; then we ask you again',
          ],
          [
            'Usage statistics and advertising measurement',
            'Consent (Art. 6(1)(a) GDPR and Art. 4(5) of Greek Law 3471/2006, or the equivalent national rules)',
            'Until you withdraw consent; each cookie’s lifetime is listed in our Cookies Policy',
          ],
          [
            'Shop applications and accounts',
            'Performance of a contract and pre-contractual steps (Art. 6(1)(b) GDPR)',
            'For as long as we work together and up to [MERCHANT RETENTION] afterwards; sign-in links expire after 30 minutes and sessions after 30 days',
          ],
        ],
      },
      {
        type: 'p',
        text: 'Where we rely on our legitimate interest, we have balanced it against your rights and keep only the data that is genuinely needed. You can object at any time (see section 7).',
      },

      { type: 'h2', text: '4. Who receives your data' },
      {
        type: 'p',
        text: 'We do not sell personal data. We share it only with providers who process it on our behalf, under a written contract and following our instructions:',
      },
      {
        type: 'ul',
        items: [
          'our **hosting and CDN provider** ([HOSTING PROVIDER]), which serves the website and keeps the logs;',
          '**Typesense Cloud**, which hosts our product search engine and processes the search requests sent to it;',
          'our **email provider** ([EMAIL PROVIDER]), which sends sign-in and update emails to shops;',
          '**Google**, only if you have consented to analytics or advertising cookies.',
        ],
      },
      {
        type: 'p',
        text: 'We may also disclose data to public authorities where the law requires it, or where this is necessary to establish, exercise or defend legal claims. Partner shops receive click-out figures from us only in aggregated form.',
      },

      { type: 'h2', text: '5. When you go to a shop' },
      {
        type: 'p',
        text: 'When you click an offer, you are taken to the shop’s own website. From that moment the shop is responsible for your data and its own privacy policy applies, so it is worth reading before you buy. The shop may know that you came from Pazari, through the referring address your browser sends and through tracking parameters (such as UTM tags) added to the link. These parameters describe the source or campaign, not who you are.',
      },
      {
        type: 'p',
        text: 'If you found us through Google Shopping, Google’s privacy policy applies to your activity on Google’s own services.',
      },

      { type: 'h2', text: '6. Transfers outside the EEA' },
      {
        type: 'p',
        text: 'Some of our providers, or their sub-processors, may process data outside the European Economic Area, for example in the United States. In that case we rely on an adequacy decision of the European Commission, such as the EU–US Data Privacy Framework for certified companies, or on the Standard Contractual Clauses approved by the Commission, together with additional safeguards where needed. You can ask us for details of these safeguards.',
      },

      { type: 'h2', text: '7. Your rights' },
      {
        type: 'p',
        text: 'Under the General Data Protection Regulation (GDPR) and Greek Law 4624/2019, you have the right to:',
      },
      {
        type: 'ul',
        items: [
          '**access** the data we hold about you and get a copy of it;',
          '**rectification** of inaccurate data;',
          '**erasure**, where there is no longer a reason to keep the data;',
          '**restriction** of processing in certain cases;',
          '**object** to processing based on our legitimate interest;',
          '**portability** of data you have given us, where processing is based on consent or contract and carried out by automated means;',
          '**withdraw your consent** at any time through the “Cookie settings” link at the bottom of every page, without affecting the lawfulness of processing before you withdrew it.',
        ],
      },
      {
        type: 'p',
        text: 'To exercise any of these rights, email **[CONTACT EMAIL]**. We will reply within one month, or within three months for complex requests, in which case we will tell you. Because we do not keep accounts, we often cannot link data to a specific person. To find logs that concern you, we may need details such as your IP address and the approximate time of your visit. If we still cannot identify you, we will explain why.',
      },
      { type: 'h3', text: 'Complaints to a supervisory authority' },
      {
        type: 'p',
        text: 'If you believe your data is being processed unlawfully, you can lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr), which is our lead supervisory authority. If you live in Cyprus, Ireland or Malta, you can also contact the authority in your country: the Office of the Commissioner for Personal Data Protection (Cyprus), the Data Protection Commission (Ireland) or the Information and Data Protection Commissioner, IDPC (Malta).',
      },

      { type: 'h2', text: '8. Security' },
      {
        type: 'p',
        text: 'The website is served only over an encrypted connection (HTTPS). Access to our logs and systems is limited to the people who need it for their work, and we review our providers’ security commitments before we start working with them.',
      },

      { type: 'h2', text: '9. No profiling or automated decisions' },
      {
        type: 'p',
        text: 'We do not make decisions about you based solely on automated processing that produce legal or similarly significant effects. The order in which offers appear depends on the product, price, availability and other offer details, not on a profile of you.',
      },

      { type: 'h2', text: '10. Children' },
      {
        type: 'p',
        text: 'Pazari is not directed at children under 15, which is the age of digital consent in Greece. We do not knowingly collect children’s data. If you believe a child has given consent or provided data to us, please contact us and we will delete it.',
      },

      { type: 'h2', text: '11. Changes to this policy' },
      {
        type: 'p',
        text: 'We may update this policy when our service or the law changes. The date at the top of the page shows the current version. If a change is significant, for example a new purpose or a new category of recipient, we will point it out clearly on the website.',
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*                               COOKIES POLICY                               */
/* -------------------------------------------------------------------------- */

export const cookiesPolicy: Record<'el' | 'en', LegalPage> = {
  el: {
    title: 'Πολιτική Cookies',
    updated: 'Τελευταία ενημέρωση: [LAST UPDATED DATE]',
    intro:
      'Η πολιτική αυτή εξηγεί ποια cookies και παρόμοιες τεχνολογίες χρησιμοποιεί το Pazari, τι κάνουν και πώς μπορείτε να τα ελέγχετε. Ο κανόνας μας είναι απλός: αυτόματα ενεργοποιείται μόνο ό,τι χρειάζεται για να λειτουργεί ο ιστότοπος· όλα τα υπόλοιπα περιμένουν τη δική σας άδεια.',
    blocks: [
      { type: 'h2', text: 'Τι είναι τα cookies και ο τοπικός χώρος αποθήκευσης' },
      {
        type: 'p',
        text: 'Τα cookies είναι μικρά αρχεία κειμένου που ένας ιστότοπος αποθηκεύει στη συσκευή σας μέσω του προγράμματος περιήγησης. Ο τοπικός χώρος αποθήκευσης (localStorage) είναι μια παρόμοια λειτουργία του προγράμματος περιήγησης, που επιτρέπει σε έναν ιστότοπο να κρατά μικρές πληροφορίες στη συσκευή σας. Στην πολιτική αυτή ο όρος «cookies» καλύπτει και τα δύο, αφού ισχύουν για αυτά οι ίδιοι κανόνες.',
      },

      { type: 'h2', text: 'Οι κατηγορίες που χρησιμοποιούμε' },
      {
        type: 'ul',
        items: [
          '**Απολύτως απαραίτητα**: χρειάζονται για να λειτουργεί ο ιστότοπος όπως περιμένετε, για παράδειγμα για να θυμάται τη χώρα σας και την επιλογή σας για τα cookies. Δεν απαιτούν συγκατάθεση και δεν απενεργοποιούνται από τις ρυθμίσεις μας, μπορείτε όμως να τα διαγράψετε από το πρόγραμμα περιήγησης.',
          '**Ανάλυσης**: μας βοηθούν να καταλαβαίνουμε πώς χρησιμοποιείται το Pazari, π.χ. ποιες σελίδες επισκέπτονται οι χρήστες και τι μπορούμε να βελτιώσουμε. Χρησιμοποιούνται μόνο με τη συγκατάθεσή σας.',
          '**Διαφήμισης**: μας βοηθούν να μετράμε αν οι διαφημίσεις μας, για παράδειγμα στη Google, φέρνουν επισκέψεις. Χρησιμοποιούνται μόνο με τη συγκατάθεσή σας.',
        ],
      },
      {
        type: 'p',
        text: 'Τα εργαλεία ανάλυσης και διαφήμισης δεν φορτώνονται καθόλου πριν δώσετε συγκατάθεση. Αν τα απορρίψετε, η αναζήτηση και η σύγκριση τιμών λειτουργούν κανονικά.',
      },

      { type: 'h2', text: 'Αναλυτικά: cookies και αποθήκευση' },
      {
        type: 'table',
        head: ['Όνομα', 'Σκοπός', 'Κατηγορία', 'Διάρκεια'],
        rows: [
          [
            'pazari_country (localStorage)',
            'Θυμάται τη χώρα και τη γλώσσα που επιλέξατε',
            'Απολύτως απαραίτητο',
            'Μέχρι να το διαγράψετε από το πρόγραμμα περιήγησης',
          ],
          [
            'pazari_consent (localStorage)',
            'Αποθηκεύει τις επιλογές σας για τα cookies, ώστε να τις τηρούμε σε κάθε επίσκεψη',
            'Απολύτως απαραίτητο',
            '12 μήνες',
          ],
          [
            'pazari_session (cookie)',
            'Κρατά συνδεδεμένους τους υπευθύνους καταστημάτων στον πίνακα του καταστήματος· δεν ορίζεται για τους επισκέπτες',
            'Απολύτως απαραίτητο',
            '30 ημέρες ή μέχρι την αποσύνδεση',
          ],
          [
            '_ga',
            'Google Analytics: ξεχωρίζει τους επισκέπτες με ένα τυχαίο αναγνωριστικό, για την παραγωγή στατιστικών χρήσης',
            'Ανάλυσης (μόνο με συγκατάθεση)',
            '2 χρόνια (όπως ορίζει η Google)',
          ],
          [
            '_ga_<ID>',
            'Google Analytics 4: παρακολουθεί την τρέχουσα περίοδο περιήγησής σας (session) στον ιστότοπό μας',
            'Ανάλυσης (μόνο με συγκατάθεση)',
            '2 χρόνια (όπως ορίζει η Google)',
          ],
          [
            '_gcl_au',
            'Google Ads: μετρά αν οι επισκέψεις και οι ενέργειες προέρχονται από τις διαφημίσεις μας (μετατροπές)',
            'Διαφήμισης (μόνο με συγκατάθεση)',
            '90 ημέρες',
          ],
        ],
      },
      {
        type: 'p',
        text: 'Τη διάρκεια των cookies της Google την ορίζει η ίδια η Google και μπορεί να αλλάξει· τα τρέχοντα στοιχεία υπάρχουν στην τεκμηρίωσή της.',
      },

      { type: 'h2', text: 'Υπηρεσίες της Google' },
      {
        type: 'p',
        text: 'Αν δώσετε συγκατάθεση, χρησιμοποιούμε το Google Tag Manager για να φορτώσουμε το Google Analytics 4 και τη μέτρηση μετατροπών του Google Ads. Για τα στατιστικά η Google ενεργεί ως εκτελούσα την επεξεργασία για λογαριασμό μας, ενώ για ορισμένες διαφημιστικές λειτουργίες μπορεί να ενεργεί ως αυτοτελής υπεύθυνος επεξεργασίας. Τα δεδομένα ενδέχεται να διαβιβάζονται στις ΗΠΑ βάσει του Πλαισίου Προστασίας Δεδομένων ΕΕ–ΗΠΑ. Περισσότερα για το πώς χρησιμοποιεί η Google τα δεδομένα θα βρείτε στη διεύθυνση policies.google.com/technologies/partner-sites.',
      },

      { type: 'h2', text: 'Πώς αλλάζετε την επιλογή σας' },
      {
        type: 'p',
        text: 'Μπορείτε να αλλάξετε ή να ανακαλέσετε τη συγκατάθεσή σας οποιαδήποτε στιγμή, επιλέγοντας **«Ρυθμίσεις cookies»** στο κάτω μέρος κάθε σελίδας. Μετά την ανάκληση τα σχετικά εργαλεία σταματούν να φορτώνονται και, όπου είναι τεχνικά εφικτό, διαγράφουμε τα cookies ανάλυσης και διαφήμισης που είχε ορίσει ο ιστότοπός μας. Η ανάκληση δεν επηρεάζει όσα συλλέχθηκαν πριν από αυτήν. Επιπλέον, σας ρωτάμε ξανά όταν η επιλογή σας συμπληρώσει 12 μήνες.',
      },

      { type: 'h2', text: 'Ρυθμίσεις του προγράμματος περιήγησης' },
      {
        type: 'p',
        text: 'Μπορείτε επίσης να διαχειρίζεστε τα cookies από τις ρυθμίσεις του προγράμματος περιήγησής σας: να βλέπετε και να διαγράφετε cookies και δεδομένα ιστοσελίδων, να αποκλείετε cookies τρίτων ή όλα τα cookies, ή να χρησιμοποιείτε ιδιωτική περιήγηση. Κάθε πρόγραμμα περιήγησης περιγράφει αυτές τις δυνατότητες στις σελίδες βοήθειάς του. Αν αποκλείσετε κάθε αποθήκευση, ο ιστότοπος θα συνεχίσει να λειτουργεί, αλλά δεν θα θυμάται ούτε τη χώρα σας ούτε την επιλογή σας για τα cookies και θα σας ρωτά ξανά σε κάθε επίσκεψη.',
      },

      { type: 'h2', text: 'Μετάβαση σε καταστήματα' },
      {
        type: 'p',
        text: 'Όταν μεταβαίνετε από το Pazari σε ένα κατάστημα, εκείνο μπορεί να ορίσει τα δικά του cookies. Δεν τα ελέγχουμε εμείς· συμβουλευτείτε την πολιτική cookies του καταστήματος.',
      },

      { type: 'h2', text: 'Επικοινωνία' },
      {
        type: 'p',
        text: 'Για ερωτήσεις σχετικά με την πολιτική αυτή, γράψτε μας στο **[CONTACT EMAIL]**. Για το πώς επεξεργαζόμαστε γενικά τα προσωπικά δεδομένα, δείτε την Πολιτική Απορρήτου.',
      },
    ],
  },

  en: {
    title: 'Cookies Policy',
    updated: 'Last updated: [LAST UPDATED DATE]',
    intro:
      'This policy explains which cookies and similar technologies Pazari uses, what they do and how you can control them. Our rule is simple: only what the website needs in order to work is set automatically; everything else waits for your permission.',
    blocks: [
      { type: 'h2', text: 'What are cookies and local storage?' },
      {
        type: 'p',
        text: 'Cookies are small text files that a website places on your device through your browser. Local storage (localStorage) is a similar browser feature that lets a website keep small pieces of information on your device. In this policy, “cookies” covers both, because the same rules apply to them.',
      },

      { type: 'h2', text: 'The categories we use' },
      {
        type: 'ul',
        items: [
          '**Strictly necessary**: needed for the website to work as you expect, for example to remember your country and your cookie choice. They do not require consent and cannot be switched off in our settings, but you can delete them in your browser.',
          '**Analytics**: help us understand how Pazari is used, such as which pages people visit and what we could improve. They are used only with your consent.',
          '**Advertising**: help us measure whether our ads, for example on Google, bring visits to the site. They are used only with your consent.',
        ],
      },
      {
        type: 'p',
        text: 'Analytics and advertising tools are not loaded at all before you give consent. If you reject them, searching and comparing prices work exactly the same.',
      },

      { type: 'h2', text: 'Cookies and storage in detail' },
      {
        type: 'table',
        head: ['Name', 'Purpose', 'Type', 'Duration'],
        rows: [
          [
            'pazari_country (localStorage)',
            'Remembers the country and language you selected',
            'Strictly necessary',
            'Until you clear it in your browser',
          ],
          [
            'pazari_consent (localStorage)',
            'Stores your cookie choices so that we respect them on every visit',
            'Strictly necessary',
            '12 months',
          ],
          [
            'pazari_session (cookie)',
            'Keeps shop staff signed in to their shop dashboard; never set for visitors',
            'Strictly necessary',
            '30 days, or until you sign out',
          ],
          [
            '_ga',
            'Google Analytics: tells visitors apart using a random identifier, to produce usage statistics',
            'Analytics (only with consent)',
            '2 years (as set by Google)',
          ],
          [
            '_ga_<ID>',
            'Google Analytics 4: keeps track of your current visit (session) on our website',
            'Analytics (only with consent)',
            '2 years (as set by Google)',
          ],
          [
            '_gcl_au',
            'Google Ads: measures whether visits and actions come from our ads (conversions)',
            'Advertising (only with consent)',
            '90 days',
          ],
        ],
      },
      {
        type: 'p',
        text: 'Google sets the lifetime of its own cookies and may change it; current details are available in Google’s documentation.',
      },

      { type: 'h2', text: 'Google services' },
      {
        type: 'p',
        text: 'If you consent, we use Google Tag Manager to load Google Analytics 4 and Google Ads conversion measurement. For statistics, Google acts as our processor; for some advertising features it may act as an independent controller. Data may be transferred to the United States under the EU–US Data Privacy Framework. You can read more about how Google uses data at policies.google.com/technologies/partner-sites.',
      },

      { type: 'h2', text: 'How to change your choice' },
      {
        type: 'p',
        text: 'You can change or withdraw your consent at any time by selecting **“Cookie settings”** at the bottom of any page. Once you withdraw, the related tools stop loading and, where technically possible, we delete the analytics and advertising cookies our website had set. Withdrawing does not affect anything collected before. We also ask you again once your choice is 12 months old.',
      },

      { type: 'h2', text: 'Browser controls' },
      {
        type: 'p',
        text: 'You can also manage cookies in your browser settings: view and delete cookies and site data, block third-party cookies or all cookies, or use private browsing. Each browser explains these options in its help pages. If you block all storage, the website will still work, but it will not remember your country or your cookie choice and will ask you again on every visit.',
      },

      { type: 'h2', text: 'Going to a shop' },
      {
        type: 'p',
        text: 'When you go from Pazari to a shop, that shop may set its own cookies. We do not control them; please check the shop’s own cookies policy.',
      },

      { type: 'h2', text: 'Contact' },
      {
        type: 'p',
        text: 'For questions about this policy, write to **[CONTACT EMAIL]**. For how we process personal data more generally, see our Privacy Policy.',
      },
    ],
  },
};
