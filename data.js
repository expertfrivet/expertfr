// Généré depuis src/services/checklist.py et la page Devis d'app.py.
// Ne pas modifier à la main : relancer mobile/generer_donnees.py.
const DATA = {
 "CORPS_ETAT": [
  "Gros œuvre / Structure / Fondations",
  "Charpente et couverture",
  "Étanchéité",
  "Façades et murs extérieurs / Ravalement",
  "Menuiseries extérieures et ouvertures",
  "Menuiseries intérieures",
  "Plâtrerie / Cloisons / Faux-plafonds",
  "Revêtements de sols",
  "Revêtements muraux et carrelage",
  "Peinture et finitions intérieures",
  "Électricité / Éclairage",
  "Plomberie / Sanitaires",
  "Chauffage / Ventilation / Climatisation (CVC)",
  "Réseaux et équipements techniques",
  "Abords / Extérieurs / VRD",
  "Chantier / Gestion de projet"
 ],
 "PREPARATION": [
  [
   "prep:ordre_de_mission_signe_recu",
   "Ordre de mission signé reçu"
  ],
  [
   "prep:acompte_recu",
   "Acompte reçu"
  ],
  [
   "prep:rendez_vous_confirme_avec_le_client_date_heure_acces_cles",
   "Rendez-vous confirmé avec le client (date, heure, accès, clés)"
  ],
  [
   "prep:parties_adverses_entreprises_convoquees_si_contradictoire",
   "Parties adverses / entreprises convoquées (si contradictoire)"
  ],
  [
   "prep:coordonnees_des_intervenants_et_assureurs_relevees",
   "Coordonnées des intervenants et assureurs relevées"
  ],
  [
   "prep:dossier_relu_avant_la_visite_historique_echanges",
   "Dossier relu avant la visite (historique, échanges)"
  ],
  [
   "prep:materiel_prepare_appareil_photo_humidimetre_metre_laser_nive",
   "Matériel préparé (appareil photo, humidimètre, mètre laser, niveau, lampe, fissuromètre)"
  ]
 ],
 "DOCUMENTS_COMMUNS": [
  [
   "docs:titre_de_propriete_acte_d_acquisition_ou_bail",
   "Titre de propriété / acte d'acquisition ou bail"
  ],
  [
   "docs:devis_marches_et_factures_des_entreprises",
   "Devis, marchés et factures des entreprises"
  ],
  [
   "docs:proces_verbal_de_reception_et_liste_des_reserves",
   "Procès-verbal de réception et liste des réserves"
  ],
  [
   "docs:attestations_d_assurance_decennale_des_entreprises",
   "Attestations d'assurance décennale des entreprises"
  ],
  [
   "docs:attestation_d_assurance_dommages_ouvrage_si_construction_10_",
   "Attestation d'assurance dommages-ouvrage (si construction < 10 ans)"
  ],
  [
   "docs:plans_permis_de_construire_declaration_prealable",
   "Plans, permis de construire / déclaration préalable"
  ],
  [
   "docs:courriers_mails_et_mises_en_demeure_echanges",
   "Courriers, mails et mises en demeure échangés"
  ],
  [
   "docs:photos_anterieures_des_desordres",
   "Photos antérieures des désordres"
  ],
  [
   "docs:rapports_d_expertise_ou_diagnostics_anterieurs",
   "Rapports d'expertise ou diagnostics antérieurs"
  ],
  [
   "docs:declaration_de_sinistre_et_n_de_dossier_assureur",
   "Déclaration de sinistre et n° de dossier assureur"
  ]
 ],
 "QUESTIONS_COMMUNES": [
  [
   "questions:date_d_apparition_des_desordres",
   "Date d'apparition des désordres"
  ],
  [
   "questions:evolution_constatee_depuis_aggravation_saisonnalite",
   "Évolution constatée depuis (aggravation, saisonnalité)"
  ],
  [
   "questions:travaux_realises_recemment_et_par_qui",
   "Travaux réalisés récemment et par qui"
  ],
  [
   "questions:mesures_conservatoires_deja_prises",
   "Mesures conservatoires déjà prises"
  ],
  [
   "questions:demarches_deja_engagees_assureur_entreprise_avocat",
   "Démarches déjà engagées (assureur, entreprise, avocat)"
  ],
  [
   "questions:attentes_du_client_vis_a_vis_de_l_expertise",
   "Attentes du client vis-à-vis de l'expertise"
  ]
 ],
 "RELEVES": [
  [
   "releves:photos_generales_de_chaque_facade_et_de_chaque_piece_concern",
   "Photos générales de chaque façade et de chaque pièce concernée"
  ],
  [
   "releves:photos_de_detail_de_chaque_desordre_avec_repere_d_echelle",
   "Photos de détail de chaque désordre avec repère d'échelle"
  ],
  [
   "releves:mesures_relevees_et_notees_dimensions_humidite_aplomb_fissur",
   "Mesures relevées et notées (dimensions, humidité, aplomb, fissures)"
  ],
  [
   "releves:croquis_localisation_des_desordres_sur_plan",
   "Croquis / localisation des désordres sur plan"
  ],
  [
   "releves:conditions_meteo_du_jour_notees",
   "Conditions météo du jour notées"
  ],
  [
   "releves:personnes_presentes_lors_de_la_visite_notees",
   "Personnes présentes lors de la visite notées"
  ]
 ],
 "CLOTURE": [
  [
   "cloture:dictee_de_l_expertise_realisee",
   "Dictée de l'expertise réalisée"
  ],
  [
   "cloture:transcription_recuperee_transkriptor",
   "Transcription récupérée (Transkriptor)"
  ],
  [
   "cloture:rapport_redige_et_mis_en_forme",
   "Rapport rédigé et mis en forme"
  ],
  [
   "cloture:rapport_relu_et_verifie",
   "Rapport relu et vérifié"
  ],
  [
   "cloture:photos_integrees_au_rapport_allegees_si_besoin",
   "Photos intégrées au rapport (allégées si besoin)"
  ],
  [
   "cloture:rapport_envoye_au_client",
   "Rapport envoyé au client"
  ],
  [
   "cloture:facture_du_solde_envoyee",
   "Facture du solde envoyée"
  ],
  [
   "cloture:solde_paye",
   "Solde payé"
  ],
  [
   "cloture:dossier_cloture",
   "Dossier clôturé"
  ]
 ],
 "BIBLIOTHEQUE": {
  "Gros œuvre / Structure / Fondations": {
   "controles": [
    [
     "ctrl_gros_uvre_structure_fondations:fissures_relevees_localisation_orientation_largeur_fissurome",
     "Fissures relevées : localisation, orientation, largeur (fissuromètre)"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:fissures_traversantes_ou_non_actives_ou_stabilisees_temoins_",
     "Fissures traversantes ou non, actives ou stabilisées (témoins posés ?)"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:aplomb_des_murs_et_planeite_des_planchers_verifies",
     "Aplomb des murs et planéité des planchers vérifiés"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:affaissements_tassements_ou_soulevements_recherches",
     "Affaissements, tassements ou soulèvements recherchés"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:linteaux_poteaux_et_poutres_controles_eclatements_aciers_app",
     "Linteaux, poteaux et poutres contrôlés (éclatements, aciers apparents)"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:remontees_capillaires_en_pied_de_mur_recherchees",
     "Remontées capillaires en pied de mur recherchées"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:nature_du_sol_et_environnement_arbres_pente_argile_observes",
     "Nature du sol et environnement (arbres, pente, argile) observés"
    ],
    [
     "ctrl_gros_uvre_structure_fondations:vide_sanitaire_sous_sol_inspecte_si_accessible",
     "Vide sanitaire / sous-sol inspecté si accessible"
    ]
   ],
   "documents": [
    [
     "docs:etude_de_sol_g1_g2_et_plans_de_fondations",
     "Étude de sol (G1/G2) et plans de fondations"
    ],
    [
     "docs:plans_beton_arme_notes_de_calcul",
     "Plans béton armé / notes de calcul"
    ],
    [
     "docs:arretes_de_catastrophe_naturelle_secheresse_de_la_commune",
     "Arrêtés de catastrophe naturelle (sécheresse) de la commune"
    ]
   ],
   "questions": [
    [
     "questions:presence_d_arbres_proches_ou_abattus_recemment",
     "Présence d'arbres proches ou abattus récemment"
    ],
    [
     "questions:travaux_de_terrassement_ou_chantier_voisin_recent",
     "Travaux de terrassement ou chantier voisin récent"
    ]
   ]
  },
  "Charpente et couverture": {
   "controles": [
    [
     "ctrl_charpente_et_couverture:etat_des_tuiles_ardoises_cassees_glissees_poreuses",
     "État des tuiles / ardoises (cassées, glissées, poreuses)"
    ],
    [
     "ctrl_charpente_et_couverture:faitage_rives_et_aretiers_controles",
     "Faîtage, rives et arêtiers contrôlés"
    ],
    [
     "ctrl_charpente_et_couverture:solins_noues_et_abergements_verifies",
     "Solins, noues et abergements vérifiés"
    ],
    [
     "ctrl_charpente_et_couverture:gouttieres_et_descentes_d_eau_pentes_fuites_obstructions",
     "Gouttières et descentes d'eau (pentes, fuites, obstructions)"
    ],
    [
     "ctrl_charpente_et_couverture:combles_inspectes_traces_d_infiltration_isolation",
     "Combles inspectés : traces d'infiltration, isolation"
    ],
    [
     "ctrl_charpente_et_couverture:charpente_deformations_fleches_assemblages",
     "Charpente : déformations, flèches, assemblages"
    ],
    [
     "ctrl_charpente_et_couverture:presence_d_insectes_xylophages_ou_champignons_recherchee",
     "Présence d'insectes xylophages ou champignons recherchée"
    ],
    [
     "ctrl_charpente_et_couverture:ecran_sous_toiture_et_ventilation_de_la_couverture",
     "Écran sous-toiture et ventilation de la couverture"
    ]
   ],
   "documents": [
    [
     "docs:facture_et_descriptif_de_la_couverture_charpente",
     "Facture et descriptif de la couverture / charpente"
    ],
    [
     "docs:traitement_de_charpente_attestation_garantie",
     "Traitement de charpente (attestation, garantie)"
    ]
   ],
   "questions": [
    [
     "questions:infiltrations_lors_de_pluies_fortes_ou_de_vent_particulier",
     "Infiltrations lors de pluies fortes ou de vent particulier"
    ],
    [
     "questions:interventions_recentes_sur_la_toiture_antenne_panneaux",
     "Interventions récentes sur la toiture (antenne, panneaux…)"
    ]
   ]
  },
  "Étanchéité": {
   "controles": [
    [
     "ctrl_etancheite:revetement_d_etancheite_fissures_cloques_decollements",
     "Revêtement d'étanchéité (fissures, cloques, décollements)"
    ],
    [
     "ctrl_etancheite:releves_d_etancheite_et_hauteurs_reglementaires",
     "Relevés d'étanchéité et hauteurs réglementaires"
    ],
    [
     "ctrl_etancheite:evacuations_d_eaux_pluviales_et_trop_pleins",
     "Évacuations d'eaux pluviales et trop-pleins"
    ],
    [
     "ctrl_etancheite:pentes_et_stagnations_d_eau",
     "Pentes et stagnations d'eau"
    ],
    [
     "ctrl_etancheite:joints_de_dilatation_et_points_singuliers",
     "Joints de dilatation et points singuliers"
    ],
    [
     "ctrl_etancheite:traces_d_infiltration_en_sous_face",
     "Traces d'infiltration en sous-face"
    ]
   ],
   "documents": [
    [
     "docs:avis_technique_fiche_produit_du_systeme_d_etancheite",
     "Avis technique / fiche produit du système d'étanchéité"
    ],
    [
     "docs:contrat_d_entretien_de_la_toiture_terrasse",
     "Contrat d'entretien de la toiture-terrasse"
    ]
   ],
   "questions": [
    [
     "questions:acces_a_la_terrasse_et_usage_circulable_jardiniere",
     "Accès à la terrasse et usage (circulable, jardinière…)"
    ]
   ]
  },
  "Façades et murs extérieurs / Ravalement": {
   "controles": [
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:fissures_et_microfissures_de_l_enduit",
     "Fissures et microfissures de l'enduit"
    ],
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:decollements_cloquages_ou_faiencage_du_revetement",
     "Décollements, cloquages ou faïençage du revêtement"
    ],
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:traces_d_humidite_mousses_salissures",
     "Traces d'humidité, mousses, salissures"
    ],
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:appuis_de_fenetres_bandeaux_et_corniches_rejet_d_eau",
     "Appuis de fenêtres, bandeaux et corniches (rejet d'eau)"
    ],
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:joints_entre_materiaux_et_autour_des_menuiseries",
     "Joints entre matériaux et autour des menuiseries"
    ],
    [
     "ctrl_facades_et_murs_exterieurs_ravalement:soubassement_et_protection_en_pied_de_facade",
     "Soubassement et protection en pied de façade"
    ]
   ],
   "documents": [
    [
     "docs:devis_facture_du_ravalement_et_fiche_produit",
     "Devis / facture du ravalement et fiche produit"
    ]
   ],
   "questions": [
    [
     "questions:date_du_dernier_ravalement",
     "Date du dernier ravalement"
    ]
   ]
  },
  "Menuiseries extérieures et ouvertures": {
   "controles": [
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:fonctionnement_des_ouvrants_ouverture_fermeture_verrouillage",
     "Fonctionnement des ouvrants (ouverture, fermeture, verrouillage)"
    ],
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:etancheite_a_l_eau_et_a_l_air_joints_calfeutrements",
     "Étanchéité à l'eau et à l'air (joints, calfeutrements)"
    ],
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:fixations_et_calage_des_dormants",
     "Fixations et calage des dormants"
    ],
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:vitrages_buee_entre_vitres_fissures_marquage",
     "Vitrages : buée entre vitres, fissures, marquage"
    ],
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:volets_stores_et_motorisations",
     "Volets, stores et motorisations"
    ],
    [
     "ctrl_menuiseries_exterieures_et_ouvertures:seuils_rejingots_et_appuis",
     "Seuils, rejingots et appuis"
    ]
   ],
   "documents": [
    [
     "docs:bon_de_commande_facture_des_menuiseries",
     "Bon de commande / facture des menuiseries"
    ],
    [
     "docs:fiches_techniques_classement_aev_uw",
     "Fiches techniques (classement AEV, Uw)"
    ]
   ],
   "questions": [
    [
     "questions:entrees_d_eau_ou_d_air_constatees_et_par_quel_temps",
     "Entrées d'eau ou d'air constatées et par quel temps"
    ]
   ]
  },
  "Menuiseries intérieures": {
   "controles": [
    [
     "ctrl_menuiseries_interieures:portes_jeu_fermeture_voilage",
     "Portes : jeu, fermeture, voilage"
    ],
    [
     "ctrl_menuiseries_interieures:huisseries_et_chambranles_fixation_aplomb",
     "Huisseries et chambranles (fixation, aplomb)"
    ],
    [
     "ctrl_menuiseries_interieures:placards_et_amenagements",
     "Placards et aménagements"
    ],
    [
     "ctrl_menuiseries_interieures:escaliers_stabilite_garde_corps_marches",
     "Escaliers : stabilité, garde-corps, marches"
    ],
    [
     "ctrl_menuiseries_interieures:parquets_et_plinthes_en_bois_lies_aux_menuiseries",
     "Parquets et plinthes en bois liés aux menuiseries"
    ]
   ],
   "documents": [
    [
     "docs:facture_et_descriptif_des_menuiseries_interieures",
     "Facture et descriptif des menuiseries intérieures"
    ]
   ],
   "questions": []
  },
  "Plâtrerie / Cloisons / Faux-plafonds": {
   "controles": [
    [
     "ctrl_platrerie_cloisons_faux_plafonds:fissures_aux_jonctions_des_plaques_et_des_cloisons",
     "Fissures aux jonctions des plaques et des cloisons"
    ],
    [
     "ctrl_platrerie_cloisons_faux_plafonds:planeite_et_aplomb_des_cloisons",
     "Planéité et aplomb des cloisons"
    ],
    [
     "ctrl_platrerie_cloisons_faux_plafonds:faux_plafonds_affaissements_taches_suspentes",
     "Faux-plafonds : affaissements, taches, suspentes"
    ],
    [
     "ctrl_platrerie_cloisons_faux_plafonds:traces_d_humidite_ou_de_moisissures",
     "Traces d'humidité ou de moisissures"
    ],
    [
     "ctrl_platrerie_cloisons_faux_plafonds:bandes_et_joints_de_finition",
     "Bandes et joints de finition"
    ],
    [
     "ctrl_platrerie_cloisons_faux_plafonds:isolation_derriere_les_doublages_si_accessible",
     "Isolation derrière les doublages (si accessible)"
    ]
   ],
   "documents": [
    [
     "docs:facture_platrier_plaquiste_et_references_des_plaques",
     "Facture plâtrier / plaquiste et références des plaques"
    ]
   ],
   "questions": []
  },
  "Revêtements de sols": {
   "controles": [
    [
     "ctrl_revetements_de_sols:planeite_du_sol_regle_de_2_m",
     "Planéité du sol (règle de 2 m)"
    ],
    [
     "ctrl_revetements_de_sols:fissures_decollements_ou_soulevements_du_revetement",
     "Fissures, décollements ou soulèvements du revêtement"
    ],
    [
     "ctrl_revetements_de_sols:carreaux_sonnant_creux",
     "Carreaux sonnant creux"
    ],
    [
     "ctrl_revetements_de_sols:joints_de_dilatation_et_de_fractionnement",
     "Joints de dilatation et de fractionnement"
    ],
    [
     "ctrl_revetements_de_sols:plinthes_et_seuils_de_transition",
     "Plinthes et seuils de transition"
    ],
    [
     "ctrl_revetements_de_sols:humidite_du_support_mesuree",
     "Humidité du support mesurée"
    ]
   ],
   "documents": [
    [
     "docs:fiche_produit_du_revetement_et_de_la_colle",
     "Fiche produit du revêtement et de la colle"
    ],
    [
     "docs:facture_de_pose_chape_ragreage_revetement",
     "Facture de pose (chape, ragréage, revêtement)"
    ]
   ],
   "questions": [
    [
     "questions:presence_d_un_plancher_chauffant",
     "Présence d'un plancher chauffant"
    ]
   ]
  },
  "Revêtements muraux et carrelage": {
   "controles": [
    [
     "ctrl_revetements_muraux_et_carrelage:carrelage_mural_decollements_fissures_joints",
     "Carrelage mural : décollements, fissures, joints"
    ],
    [
     "ctrl_revetements_muraux_et_carrelage:faience_des_pieces_humides_et_etancheite_sous_carrelage_spec",
     "Faïence des pièces humides et étanchéité sous carrelage (SPEC)"
    ],
    [
     "ctrl_revetements_muraux_et_carrelage:joints_silicone_en_peripherie_des_sanitaires",
     "Joints silicone en périphérie des sanitaires"
    ],
    [
     "ctrl_revetements_muraux_et_carrelage:papiers_peints_toiles_decollements_cloques",
     "Papiers peints / toiles : décollements, cloques"
    ]
   ],
   "documents": [
    [
     "docs:facture_et_fiche_produit_des_revetements_muraux",
     "Facture et fiche produit des revêtements muraux"
    ]
   ],
   "questions": []
  },
  "Peinture et finitions intérieures": {
   "controles": [
    [
     "ctrl_peinture_et_finitions_interieures:ecaillage_cloquage_ou_faiencage_de_la_peinture",
     "Écaillage, cloquage ou faïençage de la peinture"
    ],
    [
     "ctrl_peinture_et_finitions_interieures:taches_aureoles_et_traces_d_humidite",
     "Taches, auréoles et traces d'humidité"
    ],
    [
     "ctrl_peinture_et_finitions_interieures:aspect_de_finition_reprises_traces_de_rouleau",
     "Aspect de finition (reprises, traces de rouleau)"
    ],
    [
     "ctrl_peinture_et_finitions_interieures:moisissures_et_ventilation_de_la_piece",
     "Moisissures et ventilation de la pièce"
    ]
   ],
   "documents": [
    [
     "docs:facture_du_peintre_et_references_des_peintures",
     "Facture du peintre et références des peintures"
    ]
   ],
   "questions": []
  },
  "Électricité / Éclairage": {
   "controles": [
    [
     "ctrl_electricite_eclairage:tableau_electrique_protection_differentielle_30_ma_disjoncte",
     "Tableau électrique : protection différentielle 30 mA, disjoncteurs"
    ],
    [
     "ctrl_electricite_eclairage:mise_a_la_terre_et_liaisons_equipotentielles",
     "Mise à la terre et liaisons équipotentielles"
    ],
    [
     "ctrl_electricite_eclairage:prises_et_interrupteurs_fixation_echauffement",
     "Prises et interrupteurs (fixation, échauffement)"
    ],
    [
     "ctrl_electricite_eclairage:volumes_de_securite_des_salles_d_eau",
     "Volumes de sécurité des salles d'eau"
    ],
    [
     "ctrl_electricite_eclairage:points_lumineux_et_eclairage_exterieur",
     "Points lumineux et éclairage extérieur"
    ],
    [
     "ctrl_electricite_eclairage:traces_d_echauffement_ou_de_court_circuit",
     "Traces d'échauffement ou de court-circuit"
    ]
   ],
   "documents": [
    [
     "docs:attestation_consuel",
     "Attestation Consuel"
    ],
    [
     "docs:diagnostic_electricite_si_vente_ou_location",
     "Diagnostic électricité (si vente ou location)"
    ],
    [
     "docs:schema_electrique_de_l_installation",
     "Schéma électrique de l'installation"
    ]
   ],
   "questions": [
    [
     "questions:disjonctions_frequentes_et_dans_quelles_circonstances",
     "Disjonctions fréquentes et dans quelles circonstances"
    ]
   ]
  },
  "Plomberie / Sanitaires": {
   "controles": [
    [
     "ctrl_plomberie_sanitaires:fuites_visibles_sur_reseaux_d_alimentation_et_d_evacuation",
     "Fuites visibles sur réseaux d'alimentation et d'évacuation"
    ],
    [
     "ctrl_plomberie_sanitaires:pente_et_ventilation_des_evacuations",
     "Pente et ventilation des évacuations"
    ],
    [
     "ctrl_plomberie_sanitaires:pression_et_debit_de_l_eau",
     "Pression et débit de l'eau"
    ],
    [
     "ctrl_plomberie_sanitaires:fixation_et_etancheite_des_appareils_sanitaires",
     "Fixation et étanchéité des appareils sanitaires"
    ],
    [
     "ctrl_plomberie_sanitaires:ballon_d_eau_chaude_groupe_de_securite_etat",
     "Ballon d'eau chaude : groupe de sécurité, état"
    ],
    [
     "ctrl_plomberie_sanitaires:traces_de_degats_des_eaux_dans_les_pieces_voisines",
     "Traces de dégâts des eaux dans les pièces voisines"
    ],
    [
     "ctrl_plomberie_sanitaires:releve_du_compteur_d_eau_test_de_fuite",
     "Relevé du compteur d'eau (test de fuite)"
    ]
   ],
   "documents": [
    [
     "docs:factures_du_plombier_et_plans_des_reseaux",
     "Factures du plombier et plans des réseaux"
    ],
    [
     "docs:factures_d_eau_surconsommation",
     "Factures d'eau (surconsommation)"
    ]
   ],
   "questions": [
    [
     "questions:surconsommation_d_eau_constatee",
     "Surconsommation d'eau constatée"
    ],
    [
     "questions:odeurs_ou_refoulements",
     "Odeurs ou refoulements"
    ]
   ]
  },
  "Chauffage / Ventilation / Climatisation (CVC)": {
   "controles": [
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:generateur_chaudiere_pac_fonctionnement_plaque_signaletique",
     "Générateur (chaudière, PAC) : fonctionnement, plaque signalétique"
    ],
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:emetteurs_radiateurs_plancher_chauffant_temperature_purge",
     "Émetteurs (radiateurs, plancher chauffant) : température, purge"
    ],
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:vmc_fonctionnement_debits_aux_bouches_entrees_d_air",
     "VMC : fonctionnement, débits aux bouches, entrées d'air"
    ],
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:conduits_de_fumee_et_ventilation_du_local_chaudiere",
     "Conduits de fumée et ventilation du local chaudière"
    ],
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:temperatures_relevees_dans_les_pieces",
     "Températures relevées dans les pièces"
    ],
    [
     "ctrl_chauffage_ventilation_climatisation_cvc:condensation_et_moisissures_liees_a_la_ventilation",
     "Condensation et moisissures liées à la ventilation"
    ]
   ],
   "documents": [
    [
     "docs:contrat_et_carnet_d_entretien_de_la_chaudiere_pac",
     "Contrat et carnet d'entretien de la chaudière / PAC"
    ],
    [
     "docs:attestation_de_ramonage",
     "Attestation de ramonage"
    ],
    [
     "docs:etude_thermique_attestation_rt_2012_ou_re_2020",
     "Étude thermique / attestation RT 2012 ou RE 2020"
    ]
   ],
   "questions": [
    [
     "questions:inconfort_thermique_ressenti_et_dans_quelles_pieces",
     "Inconfort thermique ressenti et dans quelles pièces"
    ],
    [
     "questions:consommation_d_energie_anormale",
     "Consommation d'énergie anormale"
    ]
   ]
  },
  "Réseaux et équipements techniques": {
   "controles": [
    [
     "ctrl_reseaux_et_equipements_techniques:reseaux_enterres_regards_ecoulement",
     "Réseaux enterrés (regards, écoulement)"
    ],
    [
     "ctrl_reseaux_et_equipements_techniques:assainissement_collectif_ou_individuel_fosse_epandage",
     "Assainissement collectif ou individuel (fosse, épandage)"
    ],
    [
     "ctrl_reseaux_et_equipements_techniques:equipements_techniques_pompe_de_relevage_adoucisseur_alarme",
     "Équipements techniques (pompe de relevage, adoucisseur, alarme)"
    ],
    [
     "ctrl_reseaux_et_equipements_techniques:reseaux_de_communication_gaz_vmc_collective",
     "Réseaux de communication / gaz / VMC collective"
    ]
   ],
   "documents": [
    [
     "docs:controle_spanc_assainissement_individuel",
     "Contrôle SPANC (assainissement individuel)"
    ],
    [
     "docs:plans_des_reseaux_enterres",
     "Plans des réseaux enterrés"
    ]
   ],
   "questions": []
  },
  "Abords / Extérieurs / VRD": {
   "controles": [
    [
     "ctrl_abords_exterieurs_vrd:gestion_des_eaux_pluviales_autour_du_bati_pentes_regards",
     "Gestion des eaux pluviales autour du bâti (pentes, regards)"
    ],
    [
     "ctrl_abords_exterieurs_vrd:terrasses_allees_et_dallages_fissures_affaissements",
     "Terrasses, allées et dallages (fissures, affaissements)"
    ],
    [
     "ctrl_abords_exterieurs_vrd:murs_de_cloture_et_de_soutenement",
     "Murs de clôture et de soutènement"
    ],
    [
     "ctrl_abords_exterieurs_vrd:vegetation_proche_du_bati",
     "Végétation proche du bâti"
    ],
    [
     "ctrl_abords_exterieurs_vrd:acces_portail_et_voirie",
     "Accès, portail et voirie"
    ]
   ],
   "documents": [
    [
     "docs:plan_de_masse_et_plan_de_bornage",
     "Plan de masse et plan de bornage"
    ]
   ],
   "questions": [
    [
     "questions:stagnations_d_eau_ou_inondations_apres_fortes_pluies",
     "Stagnations d'eau ou inondations après fortes pluies"
    ]
   ]
  },
  "Chantier / Gestion de projet": {
   "controles": [
    [
     "ctrl_chantier_gestion_de_projet:avancement_des_travaux_par_rapport_au_planning",
     "Avancement des travaux par rapport au planning"
    ],
    [
     "ctrl_chantier_gestion_de_projet:conformite_des_ouvrages_au_devis_marche",
     "Conformité des ouvrages au devis / marché"
    ],
    [
     "ctrl_chantier_gestion_de_projet:malfacons_et_non_facons_relevees",
     "Malfaçons et non-façons relevées"
    ],
    [
     "ctrl_chantier_gestion_de_projet:securite_et_proprete_du_chantier",
     "Sécurité et propreté du chantier"
    ],
    [
     "ctrl_chantier_gestion_de_projet:situation_financiere_montants_payes_travaux_realises",
     "Situation financière (montants payés / travaux réalisés)"
    ]
   ],
   "documents": [
    [
     "docs:contrat_de_construction_ou_marche_de_travaux",
     "Contrat de construction ou marché de travaux"
    ],
    [
     "docs:planning_et_comptes_rendus_de_chantier",
     "Planning et comptes rendus de chantier"
    ],
    [
     "docs:situations_de_travaux_et_appels_de_fonds",
     "Situations de travaux et appels de fonds"
    ],
    [
     "docs:kbis_et_assurances_des_entreprises",
     "Kbis et assurances des entreprises"
    ]
   ],
   "questions": [
    [
     "questions:date_d_arret_du_chantier_et_motif",
     "Date d'arrêt du chantier et motif"
    ],
    [
     "questions:montants_deja_verses",
     "Montants déjà versés"
    ]
   ]
  }
 },
 "STATUTS": [
  "En attente",
  "OM envoyé",
  "Acompte payé",
  "Expertise réalisée",
  "Rapport envoyé",
  "Dossier payé",
  "Clôturé",
  "Annulé"
 ],
 "DEVIS": [
  [
   "calc_type_client",
   "Type de client",
   {
    "Particulier (×1.0)": 1.0,
    "Copropriété (×1.5)": 1.5,
    "Entreprise (×1.0)": 1.0,
    "Mairie / Administration (×1.2)": 1.2
   }
  ],
  [
   "calc_taille",
   "Taille du bâtiment",
   {
    "Maison < 100 m²": 400,
    "Maison > 100 m²": 500,
    "Appartement": 400,
    "Multiples appartements": 700,
    "Local commercial < 300 m²": 700,
    "Local commercial > 300 m²": 1000,
    "Entrepôt < 500 m²": 700,
    "Entrepôt > 500 m²": 1000
   }
  ],
  [
   "calc_corps",
   "Nombre de corps d'état",
   {
    "1 corps d'état (×1.0)": 1.0,
    "2 corps d'état (×1.2)": 1.2,
    "3 corps d'état (×1.3)": 1.3,
    "4 corps d'état (×1.4)": 1.4,
    "5 ou plus (×1.7)": 1.7
   }
  ],
  [
   "calc_type_exp",
   "Type d'expertise",
   {
    "Note commentée (+40 €)": 40,
    "Rapport d'expertise (+100 €)": 100,
    "Rapport + suivi administratif (+150 €)": 150,
    "Analyse pièces fournies (+250 €)": 250
   }
  ],
  [
   "calc_contra",
   "Contradictoire",
   {
    "Non contradictoire (+0 €)": 0,
    "Contradictoire (+100 €)": 100,
    "Arbitrage (+200 €)": 200,
    "Judiciaire (+250 €)": 250
   }
  ],
  [
   "calc_km",
   "Frais kilométriques",
   {
    "Moins de 50 km (+20 €)": 20,
    "50 à 100 km (+30 €)": 30,
    "100 à 200 km (+60 €)": 60,
    "Plus de 200 km (+90 €)": 90
   }
  ],
  [
   "calc_interv",
   "Nombre d'interventions",
   {
    "1 intervention (+0 €)": 0,
    "2 interventions (+320 €)": 320,
    "3 interventions (+640 €)": 640
   }
  ]
 ]
};
