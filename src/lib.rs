extern crate image;
use base64::decode;
use image::{DynamicImage, GenericImage, GenericImageView, ImageBuffer, Rgba};
use itertools::{EitherOrBoth, Itertools};
use wasm_bindgen::{
    convert::{ReturnWasmAbi, WasmPrimitive},
    prelude::*,
};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn let_encode(_array: &[u8], width: u32, height: u32, secret: String, pwd: String) -> Vec<u8> {
    log("Blur image and render from html called");
    let inp_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width, height, _array.to_vec())
        .map(DynamicImage::ImageRgba8)
        .expect("Failed to create image from raw data");
    let mut pixels_vec: Vec<u8> = Vec::new();
    let mut mod_pixels_vec: Vec<u8> = Vec::new();
    let mut text_bits: Vec<u8> = Vec::new();
    let mut rgba_vec = Vec::new();

    let encode_pwd = base64::encode(pwd);
    let encode_secret = base64::encode(secret);
    let text = format!("{encode_pwd}|{encode_secret}");

    convert_text_to_bit_array(&mut text_bits, text);
    get_pixel_bytes(&inp_img, &mut pixels_vec);
    get_mod_pixel_bytes(&pixels_vec, &text_bits, &mut mod_pixels_vec);
    get_rgba_from_mod_pixels(&mod_pixels_vec, &mut rgba_vec);
    let mod_image = image_from_new_rgba(rgba_vec, inp_img);

    if let DynamicImage::ImageRgba8(blurred_rgba_img) = mod_image {
        blurred_rgba_img.into_raw()
    } else {
        panic!("Unexpected Image Format");
    }
}

#[wasm_bindgen]
pub fn let_decode(_array: &[u8], width: u32, height: u32, pwd: String) -> String {
    let inp_img = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width, height, _array.to_vec())
        .map(DynamicImage::ImageRgba8)
        .expect("Failed to create image from raw data");

    let mut pix_bytes = Vec::new();
    for i in inp_img.pixels() {
        let (_, _, pixel) = i;
        pix_bytes.push(pixel);
    }
    let mut word_bits: Vec<u8> = Vec::new();
    for i in pix_bytes {
        let r = i[0];
        let g = i[1];
        let b = i[2];
        let bits = r & 1;
        word_bits.push(bits);
        let bits = g & 1;
        word_bits.push(bits);
        let bits = b & 1;
        word_bits.push(bits);
    }
    let mut number: u8 = 0;
    let mut bytes: Vec<u8> = Vec::new();
    let limit: usize = word_bits.len();
    let mut exp = 0;
    for i in word_bits.iter().zip(0..limit) {
        let (bit, idx) = i;
        let base: u32 = 2;
        let weight = base.pow(exp);
        match <u32 as TryInto<u8>>::try_into(weight) {
            Ok(weight) => {
                number += weight * bit;
            }
            Err(error) => {
                println!("{}", error);
                println!("Some error converting the u32 weight to u8 weight");
            }
        }
        if exp < 7 {
            exp += 1;
        }
        if (idx + 1) % 8 == 0 && idx < limit {
            bytes.push(number);
            number = 0;
            exp = 0;
        }
    }

    let mut char_vec: Vec<char> = Vec::new();
    for i in bytes {
        if i >= 32 && i <= 127 {
            char_vec.push(i as char);
        }
    }

    let mut number_finish_idx = 0;
    for i in &char_vec {
        number_finish_idx += 1;
        if *i == '_' {
            break;
        }
    }
    let mut number_str = String::new();
    for &c in char_vec.iter().take_while(|&&c| c.is_digit(10)) {
        number_str.push(c);
    }
    let len: usize = number_str.trim().parse().unwrap();

    let mut extracted_message: Vec<char> = Vec::new();
    for i in number_finish_idx..(len + number_finish_idx) {
        extracted_message.push(char_vec[i]);
    }

    let extracted_message: String = extracted_message.into_iter().collect();
    let extracted_message_slice: Vec<&str> = extracted_message.split("|").collect();
    let decode_pwd = String::from_utf8(decode(extracted_message_slice[0]).unwrap()).unwrap();
    let decode_secret = String::from_utf8(decode(extracted_message_slice[1]).unwrap()).unwrap();

    if pwd == decode_pwd {
        decode_secret
    } else {
        "".to_string()
    }
}

fn get_pixel_bytes(img: &DynamicImage, pixels_vec: &mut Vec<u8>) {
    for pixel_info in img.pixels() {
        let (_x, _y, pixel) = pixel_info;
        for i in 0..3 {
            pixels_vec.push(pixel[i]); //It pushes each byte of the pixels RGB into the vector
        }
    }
}

fn convert_text_to_bit_array(text_bits: &mut Vec<u8>, text: String) {
    let len_text = text.len();
    let len_text = len_text.to_string();
    let embed_message = String::from(len_text + "_" + &text);
    for i in embed_message.as_bytes() {
        let length = i.count_ones() + i.count_zeros();
        for n in 0..length {
            text_bits.push(i >> n & 1); //Pushes each bit of each byte of the text to the vector
        }
    }
}

fn get_mod_pixel_bytes(pixels_vec: &Vec<u8>, text_bits: &Vec<u8>, mod_pixels_vec: &mut Vec<u8>) {
    //Goes to three of the vectors Pixel bytes of the image, and the bits of the text
    //The remaining pixels is just pushed to the modified pixel vector

    for each_pixel in text_bits.iter().zip_longest(pixels_vec.iter()) {
        match each_pixel {
            EitherOrBoth::Both(word_b, pixel_byte) => {
                if *word_b == 1 {
                    //Modified Byte
                    mod_pixels_vec.push(*word_b | *pixel_byte);
                } else {
                    //Modified Byte
                    mod_pixels_vec.push(0b11111110 & *pixel_byte);
                }
            }
            EitherOrBoth::Left(_) => {
                println!("The number of bits in the word exceeded the image bytes");
            }
            EitherOrBoth::Right(pixel_byte) => {
                mod_pixels_vec.push(*pixel_byte);
            }
        }
    }
}

fn get_rgba_from_mod_pixels(mod_pixels_vec: &Vec<u8>, rgba_vec: &mut Vec<Rgba<u8>>) {
    //Converts the modified pixel bytes of the new image to Rgba<u8> or a pixel
    let len_mod_pixels = mod_pixels_vec.len();
    for i in (0..len_mod_pixels - 2).step_by(3) {
        let r = mod_pixels_vec[i];
        let g = mod_pixels_vec[i + 1];
        let b = mod_pixels_vec[i + 2];
        let a: u8 = 255;
        let rgba: [u8; 4] = [r, g, b, a];
        let pixel = Rgba(rgba);
        rgba_vec.push(pixel);
    }
}

fn image_from_new_rgba(rgba_vec: Vec<Rgba<u8>>, img: DynamicImage) -> DynamicImage {
    let mut new_img: DynamicImage = DynamicImage::new_rgba8(img.width(), img.height());
    //Plasters the pixel from the Rgba<u8> vector to the appropriate position from the old image
    for i in rgba_vec.iter().zip(img.pixels()) {
        let (mod_pixel, (x, y, _)) = i;
        new_img.put_pixel(x, y, *mod_pixel);
    }
    let colr = new_img.get_pixel(0, 0);
    log(&format!("{}", colr.0[0]));
    new_img
}
