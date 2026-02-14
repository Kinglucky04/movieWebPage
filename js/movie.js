

class Config {
    static API_KEY = "a18707ba";
    static BASE_URL = "https://www.omdbapi.com/";

    static MOVIE_QUERIES = {
        trending: ["oppenheimer","barbie","batman","dune","interstellar","dark knight"],
        popular: ["inception","matrix","avengers","star wars","lord of the rings","pulp fiction"],
        series: ["game of thrones","stranger things","the witcher","last of us","breaking bad","friends"]
    };
}



class MovieAPI {

    static async search(query, type="movie") {
        const url = `${Config.BASE_URL}?apikey=${Config.API_KEY}&s=${encodeURIComponent(query)}&type=${type}`;
        const res = await fetch(url);
        return res.json();
    }

    static async details(id) {
        const url = `${Config.BASE_URL}?apikey=${Config.API_KEY}&i=${id}&plot=short`;
        const res = await fetch(url);
        return res.json();
    }

    static async multipleMovies(queries){
        const promises = queries.map(async q=>{
            try{
                const data = await this.search(q,"movie");
                if(data.Response==="True"){
                    return await this.details(data.Search[0].imdbID);
                }
                return null;
            }catch{
                return null;
            }
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    }

    static async multipleSeries(queries){
        const promises = queries.map(async q=>{
            try{
                const data = await this.search(q,"series");
                return data.Response==="True" ? data.Search[0] : null;
            }catch{
                return null;
            }
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    }
}



class Renderer {

    static moviesGrid(movies, container){
        if(!movies?.length){
            container.innerHTML = `<p class="no-results">No movies found</p>`;
            return;
        }

        container.innerHTML = movies.map(movie=>`
        <div class="movie-card" data-imdb="${movie.imdbID}">
            <div class="movie-card-poster">
                <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'assets/images/placeholder.jpg'}"
                     onerror="this.src='assets/images/5.jpg'">
                <div class="movie-card-overlay">
                    <button class="btn-icon"><i class="fas fa-play"></i></button>
                    <button class="btn-icon"><i class="fas fa-bookmark"></i></button>
                    <button class="btn-icon"><i class="fas fa-star"></i></button>
                </div>
            </div>
            <div class="movie-card-info">
                <h3 class="movie-title">${movie.Title}</h3>
                <div class="movie-meta">
                    <span>${movie.Year}</span>
                    <span>•</span>
                    <span>${movie.Runtime||'N/A'}</span>
                    <span class="badge">${movie.imdbRating||'N/A'}</span>
                </div>
            </div>
        </div>`).join("");
    }


    static popularScroll(movies, container){
        container.innerHTML = movies.map((m,i)=>`
        <div class="scroll-item">
            <img src="${m.Poster!=='N/A'?m.Poster:'assets/images/placeholder.jpg'}">
            <span class="scroll-number">${i+1}</span>
        </div>`).join("");
    }


    static seriesGrid(series,container){
        container.innerHTML = series.map(s=>`
        <div class="series-card">
            <img src="${s.Poster!=='N/A'?s.Poster:'assets/images/placeholder.jpg'}">
            <div class="series-info">
                <h4>${s.Title}</h4>
                <p>${s.Year}</p>
            </div>
        </div>`).join("");
    }


    static hero(movie){
        document.querySelector(".hero-title").textContent = movie.Title;
        document.querySelector(".hero-rating").innerHTML =
            `<i class="fas fa-star"></i> ${movie.imdbRating||"N/A"}/10`;
        document.querySelector(".hero-year").textContent = movie.Year;
        document.querySelector(".hero-duration").textContent = movie.Runtime;
        document.querySelector(".hero-desc").textContent = movie.Plot;

        const hero = document.querySelector(".hero");
        if(movie.Poster!=="N/A"){
            hero.style.backgroundImage =
            `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.3)), url(${movie.Poster})`;
        }
    }


    static loading(show=true){
        document.querySelectorAll(".movie-grid,.scroll-container,.series-grid")
        .forEach(g=> g.classList.toggle("loading",show));
    }

    static error(msg){
        let toast=document.querySelector(".error-toast");
        if(!toast){
            toast=document.createElement("div");
            toast.className="error-toast";
            document.body.appendChild(toast);
        }
        toast.textContent=msg;
        toast.classList.add("show");
        setTimeout(()=>toast.classList.remove("show"),3000);
    }
}


class MovieController {

    static async loadSections(){
        Renderer.loading(true);
        try{
            this.trending();
            this.popular();
            this.series();
            this.continueWatching();
        }catch{
            Renderer.error("Failed to load movies");
        }finally{
            Renderer.loading(false);
        }
    }


    static async trending(){
        const grid=document.querySelector("#trending .movie-grid");
        if(!grid) return;
        const movies=await MovieAPI.multipleMovies(Config.MOVIE_QUERIES.trending);
        Renderer.moviesGrid(movies,grid);
    }

    static async popular(){
        const el=document.querySelector(".scroll-container");
        if(!el) return;
        const movies=await MovieAPI.multipleMovies(Config.MOVIE_QUERIES.popular);
        Renderer.popularScroll(movies,el);
    }

    static async series(){
        const grid=document.querySelector("#series .series-grid");
        if(!grid) return;
        const series=await MovieAPI.multipleSeries(Config.MOVIE_QUERIES.series);
        Renderer.seriesGrid(series,grid);
    }

    static continueWatching(){
        const grid=document.querySelector("#watch-list .continue-grid");
        if(!grid) return;

        const mock=[
            {title:"Inception",progress:75,poster:"assets/images/5.jpeg"},
            {title:"Tenet",progress:45,poster:"assets/images/6.jpeg"},
            {title:"Joker",progress:30,poster:"assets/images/7.jpeg"},
            {title:"Mad Max",progress:90,poster:"assets/images/8.jpeg"}
        ];

        grid.innerHTML=mock.map(m=>`
        <div class="continue-card">
            <div class="continue-poster">
                <img src="${m.poster}">
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${m.progress}%"></div>
                </div>
            </div>
            <div class="continue-info">
                <h4>${m.title}</h4>
                <span>${m.progress}% watched</span>
            </div>
        </div>`).join("");
    }


    static async search(query){
        Renderer.loading(true);
        try{
            const data=await MovieAPI.search(query);
            if(data.Response==="True"){
                const details=await Promise.all(
                    data.Search.slice(0,6).map(m=>MovieAPI.details(m.imdbID))
                );

                Renderer.hero(details[0]);
                const grid=document.querySelector("#trending .movie-grid");
                Renderer.moviesGrid(details,grid);
            }
        }catch{
            Renderer.error("Search failed");
        }finally{
            Renderer.loading(false);
        }
    }
}




class UIEvents {

    static init(){

        
        const root=document.documentElement;
        root.setAttribute("data-theme",localStorage.getItem("theme")||"dark");

        document.querySelector(".theme-toggle")?.addEventListener("click",()=>{
            const t=root.getAttribute("data-theme")==="dark"?"light":"dark";
            root.setAttribute("data-theme",t);
            localStorage.setItem("theme",t);
        });


      
        const input=document.querySelector(".search-bar input");
        let timer;
        input?.addEventListener("input",e=>{
            clearTimeout(timer);
            const q=e.target.value.trim();
            if(q.length>2){
                timer=setTimeout(()=>MovieController.search(q),500);
            }
            if(!q) MovieController.loadSections();
        });

        input?.addEventListener("keypress",e=>{
            if(e.key==="Enter"){
                MovieController.search(e.target.value.trim());
            }
        });


        
        document.querySelectorAll(".sidebar-link").forEach(link=>{
            link.addEventListener("click",e=>{
                e.preventDefault();
                document.querySelectorAll(".sidebar-link")
                .forEach(l=>l.classList.remove("active"));
                link.classList.add("active");

                const id=link.getAttribute("href")?.substring(1);
                document.getElementById(id)?.scrollIntoView({behavior:"smooth"});
            });
        });

    }
}



document.addEventListener("DOMContentLoaded",()=>{
    UIEvents.init();
    MovieController.loadSections();
});
