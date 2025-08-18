import { invoke } from "@tauri-apps/api/core"

const handleClick = async () => {
    try{
        const user = await invoke("get_current_user");

        if(user) console.log(user);
        else console.log("NO HAY USUARIO");
    }
    catch(e){
        console.log(e)
    }
}

export default function Home(){
    return(
        <div className="flex flex-col">
            <button className="h-[1000px]" onClick={handleClick}> BIENVENIDO </button>
            <button className="h-[1000px]" onClick={handleClick}> BIENVENIDO </button>
        </div>
    )
}