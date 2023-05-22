<div 
    className="fs-42 bg-[#000] fw-600 z-600 text-center user-select-none brd-radius-6 flex"
    style-dark="color-[#fff]"
    style-light="color-[#000] fs-14 z-300"
    style-hover="cursor-pointer"
>
    <span 
        className="z-300 bg-[#c4c4c4] flex-col"
        style-light="color-[#000] fs-19 fw-400"
    >
    </span>
        <div 
            className="color-[#f4f4f4]"
            style-dark="color-[#fff]"
            style-light="color-[#000]"
        >
        </div>
        <div 
            className="color-[#f4f4f4]"
            style-dark="color-[#f3f3f3]"
            style-light="color-[#010101]"
        >
        </div>
        <div className="color-[#fffff2]">
            <span className="color-[#000000]"></span>
        </div>
        <div className="color-[#fffff3] bg-[#fcfcfd]">

        </div>
</div>

function test (){
    var root = document.getElementsByTagName( 'html' )[0]; // '0' to assign the first (and only `HTML` tag)
    root.classList.add('dark');
}