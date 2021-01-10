cd elMoneyAppli
start npm run prod

cd ..
docker build -t f80hub/elmoney .
docker push f80hub/elmoney:latest

echo "Déployment terminer, poussez sur github"