import React from "react";
import "../styles/LegalPage.css";

const LegalPage = () => {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Mentions légales & Confidentialité</h1>
          <p>Dernière mise à jour : Décembre 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h3>1. Présentation du service</h3>
            <p>
              Recipes est une application web gratuite permettant de créer,
              gérer et partager des recettes de cuisine. Le service est fourni
              "tel quel" sans garantie commerciale. Il s'agit d'un projet
              personnel hébergé et maintenu de manière indépendante.
            </p>
            <p>
              L'application permet aux utilisateurs de stocker leurs recettes
              avec photos, de les organiser, d'ajuster automatiquement les
              quantités selon le nombre de portions, et de partager leurs
              créations via des liens publics ou privés.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Éditeur et hébergement</h3>
            <p>
              Ce site est édité à titre personnel. Pour toute question ou
              demande concernant le service, vous pouvez contacter
              l'administrateur à l'adresse email{" "}
              <a href="mailto:contact@reciipes.fr">contact@reciipes.fr</a>
            </p>
            <p>
              Les données sont hébergées sur des serveurs sécurisés. Les images
              sont stockées sur le serveur de l'application et optimisées
              automatiquement pour améliorer les performances.
            </p>
          </section>

          <section className="legal-section">
            <h3>3. Accès au service</h3>
            <p>
              L'accès à Recipes nécessite une authentification via Google OAuth.
              En vous connectant, vous acceptez que nous collections les
              informations de base de votre profil Google (nom, email, photo de
              profil) pour créer et gérer votre compte.
            </p>
            <p>Vous vous engagez à :</p>
            <ul>
              <li>
                Fournir des informations exactes lors de votre inscription
              </li>
              <li>Maintenir la confidentialité de votre compte</li>
              <li>
                Ne pas utiliser le service à des fins illégales ou nuisibles
              </li>
              <li>
                Respecter les droits de propriété intellectuelle des autres
              </li>
              <li>Ne pas tenter de compromettre la sécurité du service</li>
            </ul>
          </section>

          <section className="legal-section">
            <h3>4. Données personnelles collectées</h3>
            <p>
              Dans le cadre de l'utilisation du service, nous collectons et
              traitons les données suivantes :
            </p>
            <ul>
              <li>
                <strong>Données d'identification :</strong> nom, prénom, adresse
                email (via Google OAuth).
              </li>
              <li>
                <strong>Données de contenu :</strong> recettes, photos, notes,
                ingrédients, étapes de préparation.
              </li>
              <li>
                <strong>Données techniques :</strong> cookies de session, logs
                de connexion.
              </li>
              <li>
                <strong>Données d'usage :</strong> historique des recettes
                créées, modifiées et partagées.
              </li>
            </ul>
            <p>
              Nous ne collectons aucune donnée bancaire, sensible ou relative à
              la santé.
            </p>
          </section>

          <section className="legal-section">
            <h3>5. Finalité du traitement des données</h3>
            <p>Vos données personnelles sont utilisées uniquement pour :</p>
            <ul>
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Stocker et afficher vos recettes</li>
              <li>
                Permettre le partage de vos recettes selon vos préférences
              </li>
              <li>Assurer la sécurité et la stabilité du service</li>
              <li>Améliorer l'expérience utilisateur et les fonctionnalités</li>
            </ul>
            <p>
              Nous ne vendons, ne louons et ne partageons jamais vos données à
              des tiers à des fins commerciales ou publicitaires.
            </p>
          </section>

          <section className="legal-section">
            <h3>6. Durée de conservation</h3>
            <p>
              Vos données sont conservées tant que votre compte reste actif. Si
              vous supprimez votre compte, toutes vos données personnelles
              (recettes, photos, profil) seront définitivement supprimées de nos
              serveurs dans un délai maximum de 30 jours.
            </p>
          </section>

          <section className="legal-section">
            <h3>7. Sécurité des données</h3>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles
              appropriées pour protéger vos données contre tout accès non
              autorisé, perte, destruction ou altération :
            </p>
            <ul>
              <li>Authentification sécurisée via OAuth 2.0 (Google)</li>
              <li>
                Sessions utilisateur avec cookies sécurisés (HTTPS en
                production)
              </li>
              <li>Hashage des identifiants de session</li>
              <li>Validation et assainissement des données côté serveur</li>
              <li>Protection contre les injections SQL et XSS</li>
              <li>Sauvegarde régulière des données</li>
            </ul>
            <p>
              Toutefois, aucune méthode de transmission ou de stockage
              électronique n'est totalement sécurisée. Nous ne pouvons garantir
              une sécurité absolue.
            </p>
          </section>

          <section className="legal-section">
            <h3>8. Vos droits (RGPD)</h3>
            <p>
              Conformément au Règlement Général sur la Protection des Données
              (RGPD), vous disposez des droits suivants :
            </p>
            <ul>
              <li>
                <strong>Droit d'accès :</strong> obtenir une copie de vos
                données personnelles
              </li>
              <li>
                <strong>Droit de rectification :</strong> corriger vos données
                inexactes ou incomplètes
              </li>
              <li>
                <strong>Droit à l'effacement :</strong> supprimer vos données
                ("droit à l'oubli")
              </li>
              <li>
                <strong>Droit à la portabilité :</strong> récupérer vos données
                dans un format structuré
              </li>
              <li>
                <strong>Droit d'opposition :</strong> vous opposer au traitement
                de vos données
              </li>
              <li>
                <strong>Droit à la limitation :</strong> limiter le traitement
                dans certaines conditions
              </li>
            </ul>
            <p>
              Pour exercer ces droits, contactez l'administrateur via les
              coordonnées indiquées dans la section Contact.
            </p>
          </section>

          <section className="legal-section">
            <h3>9. Cookies et technologies similaires</h3>
            <p>
              Nous utilisons des cookies strictement nécessaires au
              fonctionnement du service :
            </p>
            <ul>
              <li>
                <strong>Cookie de session :</strong> maintient votre
                authentification active pendant votre visite
              </li>
              <li>
                <strong>Cookie OAuth :</strong> sécurise le processus de
                connexion via Google
              </li>
            </ul>
            <p>
              Ces cookies sont essentiels et ne peuvent pas être désactivés sans
              compromettre le fonctionnement du service. Ils ne contiennent
              aucune information personnelle lisible et expirent automatiquement
              à la fermeture de votre navigateur ou après 24 heures.
            </p>
            <p>
              Nous n'utilisons pas de cookies de tracking, de publicité ou
              d'analyse tierce.
            </p>
          </section>

          <section className="legal-section">
            <h3>10. Propriété intellectuelle</h3>
            <p>
              <strong>Votre contenu :</strong> Vous conservez tous les droits de
              propriété intellectuelle sur les recettes, photos et textes que
              vous publiez. En utilisant le service, vous nous accordez une
              licence non exclusive, gratuite et mondiale pour stocker, afficher
              et partager votre contenu conformément aux paramètres de
              visibilité que vous avez définis.
            </p>
            <p>
              <strong>Notre contenu :</strong> Le code source, le design,
              l'interface et les fonctionnalités de Recipes sont protégés par le
              droit d'auteur. Toute reproduction, distribution ou modification
              sans autorisation est interdite.
            </p>
          </section>

          <section className="legal-section">
            <h3>11. Partage et visibilité des recettes</h3>
            <p>
              Vous contrôlez la visibilité de chaque recette via deux niveaux :
            </p>
            <ul>
              <li>
                <strong>Privée :</strong> visible uniquement par vous
              </li>
              <li>
                <strong>Lien de partage :</strong> accessible à toute personne
                ayant le lien (sans authentification)
              </li>
            </ul>
            <p>
              Attention : une fois une recette rendue publique, elle peut être
              indexée par Google et autres moteurs de recherche. Le passage en
              mode privé n'entraîne pas la suppression immédiate des caches des
              moteurs de recherche.
            </p>
          </section>

          <section className="legal-section">
            <h3>12. Responsabilité et garanties</h3>
            <p>
              Le service est fourni "en l'état" sans garantie d'aucune sorte.
              Nous nous efforçons de maintenir le service disponible 24/7, mais
              nous ne garantissons pas :
            </p>
            <ul>
              <li>L'absence d'interruptions ou d'erreurs</li>
              <li>La disponibilité permanente du service</li>
              <li>
                La conservation éternelle de vos données (pensez aux sauvegardes
                personnelles)
              </li>
              <li>La compatibilité avec tous les navigateurs et appareils</li>
            </ul>
            <p>
              Nous déclinons toute responsabilité en cas de perte de données due
              à un problème technique, une cyberattaque ou toute autre cause
              indépendante de notre volonté. Il est recommandé de conserver des
              copies de vos recettes importantes.
            </p>
          </section>

          <section className="legal-section">
            <h3>13. Contenus interdits</h3>
            <p>Il est strictement interdit de publier du contenu :</p>
            <ul>
              <li>Illégal, offensant, diffamatoire ou haineux</li>
              <li>
                Violant les droits d'auteur ou de propriété intellectuelle
              </li>
              <li>Contenant des virus, malwares ou scripts malveillants</li>
              <li>À caractère pornographique, violent ou inapproprié</li>
              <li>Faisant la promotion d'activités illégales</li>
            </ul>
            <p>
              Nous nous réservons le droit de supprimer tout contenu inapproprié
              et de suspendre ou supprimer le compte de l'utilisateur concerné
              sans préavis.
            </p>
          </section>

          <section className="legal-section">
            <h3>14. Modification du service</h3>
            <p>
              Nous nous réservons le droit de modifier, suspendre ou interrompre
              tout ou partie du service à tout moment, avec ou sans préavis.
              Nous ne serons pas responsables envers vous ou envers des tiers
              pour toute modification, suspension ou interruption du service.
            </p>
          </section>

          <section className="legal-section">
            <h3>15. Modifications des conditions</h3>
            <p>
              Ces conditions peuvent être modifiées à tout moment. Les
              modifications importantes seront notifiées via l'interface de
              l'application ou par email. La date de dernière mise à jour est
              indiquée en haut de cette page.
            </p>
            <p>
              L'utilisation continue du service après une modification constitue
              votre acceptation des nouvelles conditions. Si vous n'acceptez pas
              les modifications, vous devez cesser d'utiliser le service et
              supprimer votre compte.
            </p>
          </section>

          <section className="legal-section">
            <h3>16. Loi applicable et juridiction</h3>
            <p>
              Les présentes conditions sont régies par le droit français. En cas
              de litige, les tribunaux français seront seuls compétents.
            </p>
          </section>

          <section className="legal-section">
            <h3>17. Contact</h3>
            <p>
              Pour toute question concernant ces conditions d'utilisation, vos
              données personnelles, ou pour exercer vos droits RGPD, vous pouvez
              :
            </p>
            <ul>
              <li>
                Contacter l'administrateur via l'adresse mail suivante :
                <a href="mailto:contact@reciipes.fr"> contact@reciipes.fr</a>
              </li>
            </ul>
            <p>
              Nous nous engageons à répondre à toute demande dans un délai
              maximum de 30 jours.
            </p>
          </section>
        </div>

        <div className="legal-footer">
          <a className="btn" href="/">
            ← Retour à l'accueil
          </a>
          <a className="btn" href="mailto:contact@reciipes.fr">
            Contacter le support →
          </a>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
