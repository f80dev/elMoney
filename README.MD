#Principe
Le principe de CoinMaker est de simplifier la création de monnaies sur la base d'ERC20
Il s'agit d'un projet expérimental donc l'objectif premier est de se familliariser 
avec différents concepts de l'environnement
de développement d'Elrond, à savoir :
 - l'écriture de SmartContract en RUST
 - le déploiement de ce contrat via la librairie Python ERDPY
 - la communication entre un serveur python (Flask) et le contrat déployé
 - la création de compte et la gestion des clés depuis le serveur


#Architecture
L'architecture de la solution repose sur 
- une base de données MongoDB pour stocker la liste des monnaies disponible)
- un serveur REST dialoguant avec le front end, la blocchaine et la base de données. Hébergé
- un client web développé sur Angular, compatible avec tout type de terminaux


