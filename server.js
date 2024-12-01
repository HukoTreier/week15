const express = require('express');
const axios = require('axios');
const http = require('http');
const app = express();

app.set('view engine', 'ejs'); // täpsustab view enginet
app.use(express.static('public')); // mis kaustast tohib faile saata, css koos html
app.use(express.urlencoded({ extended: true })); // täpsustab kuidas andmed kätte saadakse
app.use(express.json()); // pakib serveri vastuse kokku jsoniks

app.get('/', (req, res) => { // get päringute haldamine, /-pealeht. req- kasutaja päring, res- serveri vastus
    
    
    let url = 'https://api.themoviedb.org/3/movie/872585?api_key=8d99420b04a2ec7a516f47042c2691aa'; // kust andmeid võetakse, let sest const ei saa hiljem muuta. võtit enam kätte ei saa- serveripoolne
    axios.get(url) // axios haldab get päringut
    .then(response => { // paneb koodi ootele kuni serverilt on vastus käes
        let data = response.data; // muutujasse data salvestatakse objekt response.data
        let releaseDate = new Date(data.release_date).getFullYear();
        
        let genresToDisplay = '';
        data.genres.forEach(genre => { // iga genre jaoks, mis asub massiivis genres
            genresToDisplay = genresToDisplay + `${genre.name}, `; // kleebib üles tühja väärtuse sisse, loopides
        });
        let genresUpdated = genresToDisplay.slice(0, -2) + '.'; // lõikab viimase elemendi (,) välja ja asendab/liidab .
        let posterUrl = `https://www.themoviedb.org/t/p/w600_and_h900_bestv2${data.poster_path}`; // asendab url lõpu


        let currentYear = new Date().getFullYear();

        res.render('index', { // vasta kuva index.ejs (html) failiga. Datatorender muutujasse salvestatakse andmete tükk. year=currentyear
            dataToRender: data,
            year: currentYear,
            releaseYear: releaseDate, // releaseYear muutujasse salvestatakse date andmed
            genres: genresUpdated,
            poster: posterUrl // annab posterurl edasi
        
        }); 
    });

});

app.get('/search', (req, res) => { // päringu haldamine, kasutaja päring, serveri vastus kasutajale
    res.render('search', {movieDetails:''}); // saadab kasutajale search.ejs file, kui teeb päringu aadressiribale. Ühendab searchi moviedetails objektiga
});

app.post('/search', (req, res) => { // post päringu haldamine, nupule vajutades
    let userMovieTitle = req.body.movieTitle; // kasutaja poolt sisestatud, andmete kättesaamine

    let movieUrl = `https://api.themoviedb.org/3/search/movie?query=${userMovieTitle}&api_key=8d99420b04a2ec7a516f47042c2691aa`; // api, get päring filmi otsingule. `` ja ${userMovieTitle} abil otsib kasut sis. filmi
    let genresUrl = 'https://api.themoviedb.org/3/genre/movie/list?api_key=8d99420b04a2ec7a516f47042c2691aa&language=en-US'; // api genres id-de nimede jaoks päring serverile

    let endpoints = [movieUrl, genresUrl]; // pakib lingid ühte massiivi. 1 endpoint, 2 endpoint

    axios.all(endpoints.map((endpoint) => axios.get(endpoint))) // päring axios abil. oskab kõiki endpointe kasutada. map js võtab andmed ja teeb nendega.
    .then(axios.spread((movie, genres) => { // server saab vastuse url-idelt, rebitakse andmed lahti. movie andmed ja genres objekt
        const [movieRaw] = movie.data.results; // ebaküpsed andmed, rebib suurest massiivist 1. elemendi
        let movieGenreIds = movieRaw.genre_ids; // muutuja konkreetse filmi genre_id jaoks
        let movieGenres = genres.data.genres; // kõikide filmide genres andmebaasis, peab võrdlema omavahel
        
        let movieGenresArray = []; // massiiv (tühi koht vahemälus), kuhu salvestatakse genrete nimed

        for(let i = 0; i < movieGenreIds.length; i++) { // võrdlemine, loeb massiivi läbi kuni elemente on. i++ = i = i+1
            for(let j = 0; j < movieGenres.length; j++) { // loop kõikidele genretele, otsib id (näiteks eelnevalt leiab et 0 on id35), salvestab massiivi
                if(movieGenreIds[i] === movieGenres[j].id) { // kui mainitud id = moviegenres massiiviidle, siis lisab nime movieGenresArray-le
                    movieGenresArray.push(movieGenres[j].name); // salvestab massiivile nime
                }      
            }  
         }

         let genresToDisplay = '';
         movieGenresArray.forEach(genre => { // iga genre jaoks, mis asub massiivis genres
             genresToDisplay = genresToDisplay + `${genre}, `; // kleebib üles tühja väärtuse sisse, loopides
         });

         genresToDisplay = genresToDisplay.slice(0, -2) + '.'; // lõikab viimase elemendi (,) välja ja asendab/liidab .

        let movieData = { // pakib objekti kokku
            title: movieRaw.title, // võti (title) ja väärtus (free guy). võtab muutujast title omaduse
            year: new Date(movieRaw.release_date).getFullYear(),
            genres: genresToDisplay, // üleval objekt andmetega, see siin võti objekti omadusele
            overview: movieRaw.overview,
            posterUrl: `https://image.tmdb.org/t/p/w500${movieRaw.poster_path}` // backtick
        };

        res.render('search', {movieDetails: movieData}); // pakub kasutajale, kui sisestatakse andmeid, süstib andmed html-i. moviedetails muutujasse salvestatakse moviedata objekt. mdet süstib search koodi
    }));

}); 

// chatboti jaoks. ootab päringut, saab iframest fraasi kätte ja chatbot väljastab filmi pealkirja
app.post('/getmovie', (req, res) => { // post päringud. meiepoolse serveri pealkirja lugemine. salvestab pealkirja dialogflow serverilt
	const movieToSearch =
		req.body.queryResult && req.body.queryResult.parameters && req.body.queryResult.parameters.movie
			? req.body.queryResult.parameters.movie
			: '';

	const reqUrl = encodeURI( // annab pealkirja edasi lingile
		`http://www.omdbapi.com/?t=${movieToSearch}&apikey=53a637d2`
	);
	http.get(
		reqUrl,
		responseFromAPI => { // andmebaas tagastab andmed/vastuse
			let completeResponse = ''
			responseFromAPI.on('data', chunk => {
				completeResponse += chunk
			})
			responseFromAPI.on('end', () => { 
				const movie = JSON.parse(completeResponse);
                if (!movie || !movie.Title) { // kui meie server saab movie serverilt vastuse, et ei leia siis
                    return res.json({ 
                        fulfillmentText: 'Sorry, we could not find the movie you are asking for.',
                        source: 'getmovie'
                    });
                }

				let dataToSend = movieToSearch; // mis andmeid kuvatakse vastuseks
				dataToSend = `${movie.Title} was released in the year ${movie.Year}. It is directed by ${
					movie.Director
				} and stars ${movie.Actors}.\n Here some glimpse of the plot: ${movie.Plot}.`;

				return res.json({
					fulfillmentText: dataToSend,
					source: 'getmovie'
				});
			})
		},
		error => {
			return res.json({
				fulfillmentText: 'Could not get results at this time',
				source: 'getmovie'
			});
		}
	)
}); 
// chatboti jaoks


app.listen(process.env.PORT || 3000, () => { // kui tuleb päring portile 3000. process.env.PORT vajalik serverile, et avaldada leht (vabadus valida enda port)
    console.log('Server is running on Port 3000.');
});